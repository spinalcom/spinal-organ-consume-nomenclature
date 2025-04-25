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

import {
  ENABLE_ID_CHANGE,
  ENABLE_NAME_CHANGE,
  SPINALHUB_HTTP_PROTOCOL,
  SPINALHUB_IP,
  SPINALHUB_PORT,
  SPINALHUB_USER_ID,
  SPINALHUB_USER_PASSWORD,
} from './env'

import { FileSystem, spinalCore } from 'spinal-core-connectorjs';
import { existsSync } from 'fs';
import { resolve } from 'path';
import SpinalExcelManager from 'spinal-env-viewer-plugin-excel-manager-service';
import { SpinalNode } from 'spinal-model-graph';
import { attributeService } from 'spinal-env-viewer-plugin-documentation-service';
require('axios-debug-log/enable');
import fs = require('fs');
import { consumeBatch, Consumedfunction } from './consumeBatch';

main();

async function main() {
  // usage node index.js FILE_PATH
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Please provide a .xlsx file as an argument.');
    process.exit(1);
  }
  const absolutePath = resolve(filePath);
  // Check if the file exists
  if (!existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }
  const data = await loadExcelFile(absolutePath);
  let connectOpt = `${SPINALHUB_HTTP_PROTOCOL}://${SPINALHUB_USER_ID}:${SPINALHUB_USER_PASSWORD}@${SPINALHUB_IP}`;
  if (SPINALHUB_PORT) connectOpt += `:${SPINALHUB_PORT}/`;
  const conn = spinalCore.connect(connectOpt)

  for (const sheetName in data) {
    if (Object.prototype.hasOwnProperty.call(data, sheetName)) {
      const sheet = data[sheetName];
      await handleSheet(conn, sheet);
    }
  }
  console.log('processed all the sheets, wait for all the requests to be done (no more POST requests in flight)');
  // wait for 60 seconds more to make sure all the requests are done
  await new Promise(resolve => setTimeout(resolve, 60000));
  process.exit(0);
}

async function handleSheet(conn: FileSystem, sheet: { [key: string]: string | number | null }[]) {
  const data_to_skip = ['SpinalGraph ID', 'Dynamic ID', 'Name'];
  const promFcts: Consumedfunction<void>[] = sheet.map((row) => {
    return async () => {
      await handleRowSheet(row, data_to_skip, conn);
    };
  })
  await consumeBatch(promFcts, 50, (index, total) => {
    console.log(`processed ${index} of ${total}`);
  });
}


async function handleRowSheet(row: { [key: string]: string | number; }, data_to_skip: string[], conn: FileSystem) {
  const nodeId = row['SpinalGraph ID'];
  const serverId = row['Dynamic ID'];
  const name = row['Name'];
  if (serverId === undefined || serverId === "" || serverId === null) return;

  // get the schema to check
  const schemaToCheck: Record<string, string[]> = {};
  for (const key in row) {
    if (Object.prototype.hasOwnProperty.call(row, key) &&
      !data_to_skip.includes(key)) {
      const [cat, label] = key.split(' / ');
      if (cat && label) {
        if (!schemaToCheck[cat])
          schemaToCheck[cat] = [];
        schemaToCheck[cat].push(label);
      }
    }
  }
  //get the attrs from node
  const node = await conn.load_ptr<SpinalNode>(<number>serverId);
  const attrs = await attributeService.getAttrBySchema(node, schemaToCheck);

  // check what data to push
  const dataToPush: Record<string, Record<string, string>> = {};
  for (const key in row) {
    if (Object.prototype.hasOwnProperty.call(row, key) &&
      !data_to_skip.includes(key)) {
      let labelValueInSheet = row[key];
      const [cat, label] = key.split(' / ');
      if (cat && label) {
        const labelValueInNode = attrs[cat]?.[label];
        if (labelValueInNode) {
          // skip the value if it is the same as the one in the node
          if (labelValueInNode === labelValueInSheet)
            continue;
          // value exists in node so have to normalize the value if needed
          if (row[key] === null || row[key] === '')
            labelValueInSheet = "-";
        } else if (row[key] === null || row[key] === '' || row[key] === '-')
          // value doesn't exists in node we can skip it
          continue;
        if (dataToPush[cat] === undefined) dataToPush[cat] = {};
        dataToPush[cat][label] = labelValueInSheet.toString();
      } else {
        console.warn(`[${serverId}] Invalid key format: ${key}`);
      }
    }
  }
  // push the data to the node
  for (const cat in dataToPush) {
    if (Object.prototype.hasOwnProperty.call(dataToPush, cat)) {
      await attributeService.createOrUpdateAttrsAndCategories(node, cat, dataToPush[cat]);
    }
  }
  if (ENABLE_NAME_CHANGE) {
    node.info.name.set(name);
  }
  if (ENABLE_ID_CHANGE) {
    node.info.id.set(nodeId);
  }
}

async function loadExcelFile(filePath: string) {
  const data = await SpinalExcelManager.convertExcelToJson(filePath)
  // create a file in the same directory as the input file
  const outputDir = resolve(filePath, '..');
  const outputFileName = `${outputDir}/output.json`;
  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFileSync(outputFileName, jsonData, 'utf8');
  console.log(`JSON data written to ${outputFileName}`);
  return data;
}