/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export type { MitreAttackServerSetup, MitreAttackServerStart } from './types';
export type { MitreAttackDataClient } from './services/mitre_attack_data_client/mitre_attack_data_client_interface';
export type { MitreListParams } from '@kbn/security-mitre-attack-common';
export { config } from './config';

export const plugin = async (context: PluginInitializerContext) => {
  const { MitreAttackPlugin } = await import('./plugin');
  return new MitreAttackPlugin(context);
};
