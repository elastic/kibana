/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { MitreAttackDataService } from './data/mitre_attack_data_service';
export { MitreAttackDataClient } from './data/mitre_attack_data_client';
export { registerMitreAttackRoutes } from './routes/register_routes';
export type {
  MitreAttackDataServiceSetupParams,
  MitreAttackDataServiceCreateClientParams,
} from './data/mitre_attack_data_service';
export type {
  MitreAttackSearchParams,
  MitreAttackListParams,
} from './data/mitre_attack_data_client';
