/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import type { IRouter, Logger } from '@kbn/core/server';
import { InternalServices } from '../services';

export const registerChatRoutes = ({
  getServices,
  router,
  logger,
}: {
  router: IRouter;
  logger: Logger;
  getServices: () => InternalServices;
}) => {
  router.post(
    {
      path: '/internal/workchat/chat',
      validate: false,
    },
    async (ctx, request, res) => {
      const { agentFactory } = getServices();

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => {
        abortController.abort();
      });

      try {

        const agent = await agentFactory.getAgent({
          request,
          agentId: 'TODO',
          connectorId: 'azure-gpt4',
        });

        const { events$ } = await agent.run();

        return res.ok({
          headers: {
            // 'Content-Type': 'text/event-stream',
            // 'Cache-Control': 'no-cache',
            // Connection: 'keep-alive',
          },
          body: observableIntoEventSourceStream(events$ as unknown as Observable<ServerSentEvent>, {
            signal: abortController.signal,
            logger,
          }),
        });
      } catch (error) {
        logger.error(error);
        return res.customError({
          statusCode: 500,
          body: {
            message: 'Internal server error',
          },
        });
      }
    }
  );
};
