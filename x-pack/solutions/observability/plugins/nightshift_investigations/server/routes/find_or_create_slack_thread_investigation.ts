/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

const MAX_SLACK_TEXT_LENGTH = 40_000;

export const findOrCreateSlackThreadInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations/_slack_thread',
  options: {
    access: 'internal',
    summary: "Find or create a Slack thread's investigation",
    description:
      'Returns the investigation and status message for a Slack thread. With ' +
      '`create`, a thread without one gets a pending investigation; otherwise the response is ' +
      'empty. With `status_message_ts`, records that message as the thread status message. ' +
      'With `event_id` and `execution_id`, records the delivered event for that execution and ' +
      'marks the response `duplicate` when another execution already recorded it. With ' +
      '`release_event`, removes the event as recorded for that execution instead. Called by the ' +
      'Slack thread workflow.',
  },
  security: {
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    body: lazySchema(() =>
      z
        .object({
          workspace: z.string().min(1).max(MAX_KEYWORD_LENGTH),
          channel: z.string().min(1).max(MAX_KEYWORD_LENGTH),
          thread_ts: z.string().min(1).max(MAX_KEYWORD_LENGTH),
          text: z.string().max(MAX_SLACK_TEXT_LENGTH).optional(),
          create: z.boolean(),
          status_message_ts: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
          event_id: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
          /** The workflow execution handling `event_id`. */
          execution_id: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
          release_event: z.boolean().optional(),
        })
        .refine((body) => (body.event_id === undefined) === (body.execution_id === undefined), {
          message: 'event_id and execution_id must be given together',
        })
        .refine((body) => !body.release_event || body.event_id !== undefined, {
          message: 'release_event requires event_id',
        })
    ),
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const client = getInvestigationsClient(request);
    const {
      workspace,
      channel,
      thread_ts: threadTs,
      text,
      create,
      status_message_ts: statusMessageTs,
      event_id: eventId,
      execution_id: executionId,
      release_event: releaseEvent,
    } = params.body;
    try {
      return (
        (await client.findOrCreateSlackThread({
          workspace,
          channel,
          threadTs,
          text,
          create,
          statusMessageTs,
          ...(eventId !== undefined &&
            executionId !== undefined && { event: { eventId, executionId } }),
          ...(releaseEvent && { releaseEvent }),
        })) ?? {}
      );
    } catch (error) {
      rethrowInvestigationClientError(error);
    }
  },
});
