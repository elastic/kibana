/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { registerSubmitSubscriptionRoute } from './submit_subscription';

export const registerRoutes = (router: IRouter, logger: Logger): void => {
  registerSubmitSubscriptionRoute(router, logger);
};
