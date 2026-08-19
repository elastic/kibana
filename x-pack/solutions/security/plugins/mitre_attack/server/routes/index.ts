/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { MitreAttackDataClient } from '../services/mitre_attack_data_client';
import { registerGetEntitiesRoute } from './get_entities';
import { registerSearchEntitiesRoute } from './search_entities';
import { registerEsqlDemoRoute } from './esql_demo';

export const registerRoutes = (
  router: IRouter<RequestHandlerContext>,
  getDataClient: () => MitreAttackDataClient | undefined,
  getRepository: () => ISavedObjectsRepository | undefined
): void => {
  registerGetEntitiesRoute(router, getDataClient);
  registerSearchEntitiesRoute(router, getDataClient);
  registerEsqlDemoRoute(router, getRepository);
};
