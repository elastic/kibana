/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { schema } from '@kbn/config-schema';
import { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import type { RouteDependencies } from './types';

export const registerChatRoutes = ({ getServices, router, logger }: RouteDependencies) => {
  const stubLogger = {
    debug: () => undefined,
    error: () => undefined,
  };

  router.post(
    {
      path: '/internal/workchat/chat',
      validate: {
        body: schema.object({
          conversationId: schema.maybe(schema.string()),
          connectorId: schema.maybe(schema.string()),
          agentId: schema.string(),
          nextMessage: schema.string(),
        }),
      },
    },
    async (ctx, request, res) => {
      const { chatService } = getServices();

      const { nextMessage, conversationId, agentId, connectorId } = request.body;

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => {
        abortController.abort();
      });

      try {
        const events$ = chatService.converse({
          request,
          connectorId: connectorId ?? 'azure-gpt4', // TODO: auto-select on server-side when not present
          agentId,
          nextUserMessage: nextMessage,
          conversationId,
        });

        return res.ok({
          // TODO uncomment when https://github.com/elastic/kibana/pull/213151 is merged
          headers: {
            // 'Content-Type': 'text/event-stream',
            // 'Cache-Control': 'no-cache',
            // Connection: 'keep-alive',
          },
          body: observableIntoEventSourceStream(events$ as unknown as Observable<ServerSentEvent>, {
            signal: abortController.signal,
            // already logging at the service level
            logger: stubLogger,
          }),
        });
      } catch (err) {
        logger.error(err);
        throw err;
      }
    }
  );
};
