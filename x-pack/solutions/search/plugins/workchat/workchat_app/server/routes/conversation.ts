/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import type {
  ListConversationResponse,
  GetConversationResponse,
} from '../../common/http_api/conversation';
import { InternalServices } from '../services';

export const registerConversationRoutes = ({
  getServices,
  router,
  logger,
}: {
  router: IRouter;
  logger: Logger;
  getServices: () => InternalServices;
}) => {
  router.get(
    {
      path: '/internal/workchat/conversations/{conversationId}',
      validate: {
        params: schema.object({
          conversationId: schema.string(),
        }),
      },
    },
    async (ctx, request, res) => {
      const { conversationService } = getServices();
      const client = await conversationService.getScopedClient({ request });

      const { conversationId } = request.params;

      const conversation = await client.get({ conversationId });

      return res.ok<GetConversationResponse>({
        body: conversation,
      });
    }
  );

  router.post(
    {
      path: '/internal/workchat/conversations',
      validate: {
        body: schema.object({}),
      },
    },
    async (ctx, request, res) => {
      const { conversationService } = getServices();
      const client = await conversationService.getScopedClient({ request });

      const conversations = await client.list();

      return res.ok<ListConversationResponse>({
        body: {
          conversations,
        },
      });
    }
  );
};
