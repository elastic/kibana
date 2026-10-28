/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { MAX_TEXT_LENGTH, MAX_TITLE_LENGTH } from '@kbn/significant-events-schema';
import {
  freeFormContextSchema,
  investigationNotificationDestinationsSchema,
  MAX_ALERTS_PER_INVESTIGATION,
} from '../../common';
import { DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID, MAX_KEYWORD_LENGTH } from '../../common';
import { fetchInvestigationAlertSnapshots } from '../lib/alert_snapshot';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

const startInvestigationMessage = {
  message: z.string().min(1).max(MAX_TEXT_LENGTH).optional(),
};

const startInvestigationModel = {
  connector_id: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
};

/**
 * Accepted for compatibility but not stored as the investigation's title: Agent Builder generates
 * that from the investigation's first round.
 */
const titleSchema = z.string().min(1).max(MAX_TITLE_LENGTH);

// A union rather than one object with a loose `context`, so that an alert investigation is
// always backed by alert data: the alert branch accepts no caller context — the handler loads
// the alert server-side (through the RAC alerts client, which enforces alert-index
// authorization) and builds the snapshot itself. zod's discriminatedUnion needs the
// discriminator at the top level, and ours is nested under `subject`, hence a plain union.
const startInvestigationBodySchema = z.union([
  z.object({
    subject: z.object({
      type: z.literal('alert'),
      ids: z
        .array(z.string().min(1).max(MAX_KEYWORD_LENGTH))
        .min(1)
        .max(MAX_ALERTS_PER_INVESTIGATION),
      summary: z.string().max(MAX_TEXT_LENGTH).optional(),
    }),
    title: titleSchema.optional(),
    ...startInvestigationMessage,
    ...startInvestigationModel,
    notificationDestinations: investigationNotificationDestinationsSchema.optional(),
  }),
  // A manual investigation is defined by its question, so `message` is required and the
  // subject id is optional: there is no entity to point at, only the prompt.
  z.object({
    subject: z.object({
      type: z.literal('manual'),
      id: z
        .string()
        .min(1)
        .max(MAX_KEYWORD_LENGTH)
        .default(DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID),
      summary: z.string().max(MAX_TEXT_LENGTH).optional(),
    }),
    title: titleSchema.optional(),
    context: freeFormContextSchema.optional(),
    message: z.string().min(1).max(MAX_TEXT_LENGTH),
    ...startInvestigationModel,
    notificationDestinations: investigationNotificationDestinationsSchema.optional(),
  }),
]);

type StartInvestigationBody = z.infer<typeof startInvestigationBodySchema>;
type AlertInvestigationBody = Extract<StartInvestigationBody, { subject: { type: 'alert' } }>;
/** Narrows the whole body, which a `switch` on the nested `subject.type` cannot do. */
const isAlertBody = (body: StartInvestigationBody): body is AlertInvestigationBody =>
  body.subject.type === 'alert';
export const startInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations',
  options: {
    access: 'internal',
    summary: 'Start an investigation',
    description:
      'Starts an investigation for a given subject, or continues the open investigation that ' +
      'already holds it. An alert subject takes one or more alert ids, classic or universal; the ' +
      'first is the stored subject, used for naming and the summary, and returns the investigation (Agent Builder conversation) id. A new ' +
      'investigation is created when the start is accepted; its run records the subjects.',
  },
  security: {
    // agentBuilder:write is required because a start that opens a new investigation creates its
    // Agent Builder conversation as the calling user. It is also the best available signal that
    // a user has been granted access to AI-resource-consuming features in this deployment. When
    // conversation templates land with their own privilege model, this should be revisited.
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    body: startInvestigationBodySchema,
  }),
  handler: async ({
    request,
    params,
    getInvestigationsClient,
    getAlertsClient,
    getEpisodeLookup,
  }) => {
    const client = getInvestigationsClient(request);
    const { body } = params;

    // User-initiated starts are always manual.
    try {
      if (isAlertBody(body)) {
        const alertsClient = await getAlertsClient(request);
        if (!alertsClient) {
          throw serverUnavailable('Alert lookup is unavailable');
        }
        const lookup = getEpisodeLookup(request);
        const [primaryId] = body.subject.ids;
        const alerts = await fetchInvestigationAlertSnapshots({
          alertsClient,
          alertIds: body.subject.ids,
          ...lookup,
        });
        return await client.start({
          subject: { type: 'alert', id: primaryId, summary: body.subject.summary },
          title: body.title,
          context: { alerts },
          trigger_type: 'manual',
          message: body.message,
          ...(body.connector_id ? { connector_id: body.connector_id } : {}),
          ...(body.notificationDestinations
            ? { notificationDestinations: body.notificationDestinations }
            : {}),
        });
      }
      return await client.start({ ...body, trigger_type: 'manual' });
    } catch (error) {
      rethrowInvestigationClientError(error);
    }
  },
});
