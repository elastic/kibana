/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { InternalServices } from '../services';
import { registerChatRoutes } from './chat';
import { registerConversationRoutes } from './conversation';

export const registerRoutes = ({
  router,
  logger,
  getServices,
}: {
  router: IRouter;
  logger: Logger;
  getServices: () => InternalServices;
}) => {
  registerChatRoutes({ router, logger, getServices });
  registerConversationRoutes({ router, logger, getServices });
};
