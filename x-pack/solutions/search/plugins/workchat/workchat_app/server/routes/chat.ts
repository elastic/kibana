/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { InternalServices } from '../services';

export const registerChatRoutes = ({
  getServices,
  router,
}: {
  router: IRouter;
  getServices: () => InternalServices;
}) => {
  router.post(
    {
      path: '/internal/workchat/chat',
      validate: false,
    },
    async (ctx, request, res) => {
      const { agentFactory } = getServices();

      const agent = await agentFactory.getAgent({ request, agentId: 'TODO', connectorId: 'TODO' });

      agent.run();

      return res.ok();
    }
  );
};
