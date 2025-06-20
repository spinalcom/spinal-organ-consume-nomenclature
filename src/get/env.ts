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

import dotenv = require('dotenv');
import { resolve } from 'path';
import type { IConfig } from './IConfig';
const processEnv: any = {};

export const config: IConfig = require(resolve(
  __dirname,
  '..',
  '..',
  'get_config'
));

// verify the config
if (
  !config ||
  typeof config.statingNodeServerId !== 'number' ||
  config.statingNodeServerId === 0 ||
  !config.targetToGet ||
  (config.mode !== 'CONTEXT' && config.mode !== 'RELATION')
) {
  console.error(
    'The config is not valid, please check the get_config.js file.'
  );
  process.exit(-1);
}

dotenv.config({
  processEnv: processEnv,
  path: [
    resolve(__dirname, '..', '..', '.env.local'),
    resolve(__dirname, '..', '..', '.env'),
  ],
});

for (var key in processEnv) {
  if (processEnv[key]) {
    process.env[key] = processEnv[key];
  }
}

checkEnv();
export const SPINALHUB_HTTP_PROTOCOL = process.env.SPINALHUB_PROTOCOL;
export const SPINALHUB_IP = process.env.SPINALHUB_IP;
export const SPINALHUB_PORT = process.env.SPINALHUB_PORT;
export const SPINALHUB_USER_ID = process.env.SPINAL_USER_ID;
export const SPINALHUB_USER_PASSWORD = process.env.SPINAL_PASSWORD;

function checkEnv() {
  const env_keys = [
    'SPINALHUB_PROTOCOL',
    'SPINALHUB_IP',
    'SPINAL_USER_ID',
    'SPINAL_PASSWORD',
  ] as const;

  const missing_keys = [];
  for (let i = 0; i < env_keys.length; i++) {
    const key = env_keys[i];
    if (!process.env[key]) {
      missing_keys.push(key);
    }
  }
  if (missing_keys.length > 0) {
    console.error(`missing ${missing_keys} in env`);
    process.exit(-1);
  }
}
