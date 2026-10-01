/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
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
      'Returns the investigation and status message for a Slack thread, found by the ' +
      "thread's Agent Builder conversation origin (`team:<T>/channel:<C>/thread:<ts>`) or its " +
      '`slack_thread` subject. With `create`, a thread without one gets a new investigation ' +
      'conversation with that origin and the thread as its subject; otherwise the response is ' +
      'empty. With `status_message_ts`, records that message as the thread status message on the ' +
      "thread's subject. With `event_id`, records the delivered event on the thread's subject and " +
      'marks the response `duplicate` when the thread already recorded it. Called by the Slack ' +
      'thread workflow, whose identity must own the investigation.',
  },
  security: {
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    body: z.object({
      workspace: z.string().min(1).max(MAX_KEYWORD_LENGTH),
      channel: z.string().min(1).max(MAX_KEYWORD_LENGTH),
      thread_ts: z.string().min(1).max(MAX_KEYWORD_LENGTH),
      text: z.string().max(MAX_SLACK_TEXT_LENGTH).optional(),
      create: z.boolean(),
      status_message_ts: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
      event_id: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
    }),
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
          eventId,
        })) ?? {}
      );
    } catch (error) {
      rethrowInvestigationClientError(error);
    }
  },
});
