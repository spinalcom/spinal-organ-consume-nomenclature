/*
 * Copyright 2025 SpinalCom - www.spinalcom.com
 *
 * This file is part of SpinalCore.
 *
 * Please read all of the following terms and conditions
 * of the Free Software license Agreement ("Agreement")
 * carefully.
 *
 * This Agreement is a legally binding contract between
 * the Licensee (as defined below) and SpinalCom that
 * sets forth the terms and conditions that govern your
 * use of the Program. By installing and/or using the
 * Program, you agree to abide by all the terms and
 * conditions stated or referenced herein.
 *
 * If you do not agree to abide by these terms and
 * conditions, do not demonstrate your acceptance and do
 * not install or use the Program.
 * You should have received a copy of the license along
 * with this file. If not, see
 * <http://resources.spinalcom.com/licenses.pdf>.
 */

import { spinalCore, FileSystem } from 'spinal-core-connectorjs';
import {
  config,
  SPINALHUB_HTTP_PROTOCOL,
  SPINALHUB_IP,
  SPINALHUB_PORT,
  SPINALHUB_USER_ID,
  SPINALHUB_USER_PASSWORD,
} from './env';
import type { IConfig, IConfigRelation } from './IConfig';
import type { SpinalContext, SpinalNode } from 'spinal-model-graph';
import { attributeService } from 'spinal-env-viewer-plugin-documentation-service';
import { consumeBatch } from '../consumeBatch';
import { createWriteStream, writeFileSync, WriteStream } from 'fs';
import { SpinalExcelManager } from 'spinal-env-viewer-plugin-excel-manager-service';

main();
async function main() {
  let connectOpt = `${SPINALHUB_HTTP_PROTOCOL}://${SPINALHUB_USER_ID}:${SPINALHUB_USER_PASSWORD}@${SPINALHUB_IP}`;
  if (SPINALHUB_PORT) connectOpt += `:${SPINALHUB_PORT}/`;
  console.log(`Connecting to SpinalHub at ${connectOpt}`);
  const conn = spinalCore.connect(connectOpt);

  const targets: SpinalNode[] = isConfigModeRelation(config)
    ? await getTargetsWithRelations(conn)
    : await getTargetsFromContext(conn);

  if (targets.length === 0) {
    console.error('No targets found based on the provided configuration.');
    process.exit(0);
  }
  console.log(`Found ${targets.length} targets.`);

  const promFcts = targets.map((target) => {
    return async () => {
      return getAttributes(target);
    };
  });
  const result = await consumeBatch<Record<string, string | number | boolean>>(
    promFcts,
    50,
    (index, total) => {
      console.log(`processed ${index} of ${total}`);
    }
  );
  await outputToFile(result);
  console.log(`Data extraction completed.`);
  process.exit(0);
}

async function getAttributes(
  target: SpinalNode
): Promise<Record<string, string | number | boolean>> {
  const attributes = await attributeService.getAttrBySchema(
    target,
    config.attrSchema
  );
  const result: Record<string, string | number | boolean> = {
    'SpinalGraph ID': target.info.id.get(),
    'Dynamic ID': target._server_id,
    Name: target.info.name.get(),
  };
  for (const infoAttr of config.infoFromNode) {
    if (infoAttr in target.info) {
      result[infoAttr] = target.info[infoAttr].get();
    }
  }
  for (const catKey in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, catKey)) {
      const categoryAttr = attributes[catKey];
      for (const attrKey in categoryAttr) {
        if (Object.prototype.hasOwnProperty.call(categoryAttr, attrKey)) {
          const value = categoryAttr[attrKey];
          if (value !== undefined && value !== null) {
            result[catKey + ' / ' + attrKey] = value;
          }
        }
      }
    }
  }
  return result;
}

async function getTargetsWithRelations(
  conn: FileSystem
): Promise<SpinalNode[]> {
  const startingNode = (await spinalCore.load_ptr(
    conn,
    config.statingNodeServerId
  )) as SpinalNode;
  if (!startingNode) {
    console.error('Stating node server not found.');
    process.exit(1);
  }
  let counter = 0;
  const targets: SpinalNode[] = await startingNode.find(
    config.relationNames,
    (spinalnode: SpinalNode) => {
      if (typeof config.targetToGet === 'string') {
        if (spinalnode.info.type.get() === config.targetToGet) {
          counter++;
          if (counter % 100 === 0) {
            console.log(`Found ${counter} targets so far...`);
          }
          return true;
        }
      } else if (typeof config.targetToGet === 'function') {
        if (config.targetToGet(spinalnode)) {
          counter++;
          if (counter % 100 === 0) {
            console.log(`Found ${counter} targets so far...`);
          }
          return true;
        }
      }
      return false;
    }
  );
  return targets;
}

async function getTargetsFromContext(conn: FileSystem): Promise<SpinalNode[]> {
  const [startingNode, contextNode] = await Promise.all([
    spinalCore.load_ptr(
      conn,
      config.statingNodeServerId
    ) as Promise<SpinalNode>,
    spinalCore.load_ptr(conn, config.contextServerId) as Promise<SpinalContext>,
  ]);
  if (!startingNode || !contextNode) {
    console.error('Stating node or context server not found.');
    process.exit(1);
  }
  let counter = 0;
  const targets: SpinalNode[] = await startingNode.findInContext(
    contextNode,
    (spinalnode: SpinalNode) => {
      if (typeof config.targetToGet === 'string') {
        if (spinalnode.info.type.get() === config.targetToGet) {
          counter++;
          if (counter % 100 === 0) {
            console.log(`Found ${counter} targets so far...`);
          }
          return true;
        }
      } else if (typeof config.targetToGet === 'function') {
        if (config.targetToGet(spinalnode)) {
          counter++;
          if (counter % 100 === 0) {
            console.log(`Found ${counter} targets so far...`);
          }
          return true;
        }
      }
      return false;
    }
  );
  return targets;
}

async function outputToFile(
  result: Record<string, string | number | boolean>[]
) {
  if (config.exportMode?.toLowerCase() === 'xlsx') {
    const data = formatDataForExportTable(result);
    const workbooks = await SpinalExcelManager.exportViaWorkbook(data);
    const outputFileName = `extract.xlsx`;
    await workbooks[0].xlsx.writeFile(outputFileName);
  } else if (config.exportMode?.toLowerCase() === 'csv') {
    const data = formatDataForExportTable(result);
    const outputFileName = `extract.csv`;
    const ws = createWriteStream(outputFileName);
    ws.write(
      data[0].data[0].header.map((header) => header.header).join(',') + '\n'
    );
    data[0].data[0].rows.forEach((row) => {
      ws.write(
        Object.values(row)
          .map((value) => (typeof value === 'string' ? `"${value}"` : value))
          .join(',') + '\n'
      );
    });
    ws.end();
    await new Promise((resolve) => {
      ws.on('finish', () => {
        console.log(`Data extracted and saved to ${outputFileName}`);
        process.exit(0);
      });
    });
  } else {
    const outputFileName = `extract.json`;
    const jsonData = JSON.stringify(result, null, 2);
    writeFileSync(outputFileName, jsonData, 'utf8');
    console.log(`Data extracted and saved to ${outputFileName}`);
  }
}

function formatDataForExportTable(
  input: Record<string, string | number | boolean>[]
) {
  const result = [
    {
      name: 'name',
      author: 'author',
      data: [],
    },
  ];
  const sheet = {
    name: 'MAIN',
    header: [],
    rows: [],
  };
  result[0].data.push(sheet);
  // get the headers from all the elements
  const headersStr: string[] = ['SpinalGraph ID', 'Dynamic ID', 'Name'];
  input.forEach((item) => {
    Object.keys(item).forEach((key) => {
      if (!headersStr.includes(key)) {
        headersStr.push(key);
      }
    });
  });
  let id = 1;
  // create the header objects
  sheet.header = headersStr.map((header) => ({
    key: `id${id++}`,
    header,
    width: 10,
  }));

  sheet.rows = input.map((data) => {
    const row: Record<string, string | number | boolean> = {};
    sheet.header.forEach((header) => {
      const key = header.key;
      row[key] = data[header.header] !== undefined ? data[header.header] : '';
    });
    return row;
  });

  return result;
}

function isConfigModeRelation(config: IConfig): config is IConfigRelation {
  return config && config.mode === 'RELATION';
}
