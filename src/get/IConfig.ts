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
import type { SpinalNode } from 'spinal-model-graph';

export type TTargetToGetPredicate = (node: SpinalNode) => boolean;
export interface IConfig {
  /**
   * the _server_id of the starting node
   * @type {number}
   * @memberof IConfig
   */
  statingNodeServerId: number;

  /**
   * To filter the targets to get
   * - if targetToGet is a string, the node type will be used to filter
   * - if targetToGet is a function,
   *   - the function will be called with the spinalnode as parameter
   *   - must return true to keep the node
   *
   * @type {(string | TTargetToGetPredicate)}
   * @memberof IConfig
   */
  targetToGet: string | TTargetToGetPredicate;

  /**
   * the mode to retrive the targets
   * - CONTEXT : will une the context to get the children
   *   - if you use context, you must set the contextServerId
   * - RELATION : will use the relationList to get the children, this mode usually more performant and flexible
   *   - if you use relation, you must set the relationNames
   * @type {('CONTEXT' | 'RELATION')}
   * @memberof IConfig
   */
  mode: 'CONTEXT' | 'RELATION';

  /**
   * in mode CONTEXT, the _server_id of the context to use
   * @type {number}
   * @memberof IConfig
   */
  contextServerId?: number;
  /**
   * in mode RELATION, the list of relation names to use
   * @type {string[]}
   * @memberof IConfig
   */
  relationNames?: string[];

  /**
   * The list of attributes to get from the targets in the node.info
   * the values of SpinalGraph ID, Dynamic ID, Name will always be present
   * @type {string[]}
   * @memberof IConfig
   */
  infoFromNode: string[];
  /**
   * Schema to get the attributes to get from the targets
   * @type {Record<string, string[]>}
   * @memberof IConfig
   */
  attrSchema: Record<string, readonly string[]>;
}

export interface IConfigContext extends IConfig {
  mode: 'CONTEXT';
  /**
   * in mode CONTEXT, the _server_id of the context to use
   * @type {number}
   * @memberof IConfigContext
   */
  contextServerId: number;
}
export interface IConfigRelation extends IConfig {
  mode: 'RELATION';
  /**
   * in mode RELATION, the list of relation names to use
   * @type {string[]}
   * @memberof IConfigRelation
   */
  relationNames: string[];
}
