/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { MitreAttackRequestHandlerContext } from '../types';
import { registerGetEntitiesRoute } from './get_entities';

interface RegisterRoutesParams {
  router: IRouter<MitreAttackRequestHandlerContext>;
  logger: Logger;
}

export const registerRoutes = ({ router, logger }: RegisterRoutesParams): void => {
  registerGetEntitiesRoute(router, logger);
};
