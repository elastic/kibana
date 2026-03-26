/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CloudDefendPlugin } from './plugin';

export type { CloudDefendSecuritySolutionContext } from './types';
export { getSecuritySolutionLink } from './common/navigation/security_solution_links';
export { CLOUD_DEFEND_BASE_PATH } from './common/navigation/constants';
export type { CloudDefendPageId } from './common/navigation/types';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new CloudDefendPlugin();
}
export type { CloudDefendPluginSetup, CloudDefendPluginStart } from './types';
