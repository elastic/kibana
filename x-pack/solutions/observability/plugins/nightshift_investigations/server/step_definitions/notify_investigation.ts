/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { MAX_KEYWORD_LENGTH } from '../../common';
import type { GetInvestigationsClient } from '../routes/types';
import { deliverInvestigationNotifications } from '../lib/notifications/deliver_investigation_notifications';

const inputSchema = z.object({
  investigation_id: z
    .string()
    .min(1)
    .max(MAX_KEYWORD_LENGTH)
    .describe('The settled investigation whose recorded Slack destinations should be notified'),
});

export const notifyInvestigationStepDefinition = ({
  getInvestigationsClient,
  getActions,
}: {
  getInvestigationsClient: GetInvestigationsClient;
  getActions: () => ActionsPluginStart | undefined;
}) =>
  createServerStepDefinition({
    id: 'nightshift.notifyInvestigation',
    label: 'Notify Nightshift Investigation Destinations',
    category: StepCategory.Ai,
    description:
      'Posts the outcome of a settled investigation to every Slack destination recorded on it and stores each delivery result on the investigation. A Slack failure is recorded, not thrown, so it never fails the run.',
    inputSchema,
    outputSchema: z.object({
      sent: z.number().describe('Destinations that received the message in this run'),
      failed: z.number().describe('Destinations whose delivery failed in this run'),
    }),
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const {
        kibanaUrl,
        workflow: { spaceId },
      } = context.contextManager.getContext();
      const { investigation_id: investigationId } = inputSchema.parse(context.input);

      // Reads the settled record rather than the agent output so the message matches Kibana.
      const client = getInvestigationsClient(request, spaceId);
      const investigation = await client.get(investigationId);
      const pending = (investigation.notifications ?? []).filter(({ status }) => status !== 'sent');
      if (pending.length === 0) {
        return { output: { sent: 0, failed: 0 } };
      }

      const actions = getActions();
      if (!actions) {
        throw new Error('actions plugin is not available, cannot deliver Slack notifications');
      }
      const actionsClient = await actions.getActionsClientWithRequest(request);

      const result = await deliverInvestigationNotifications({
        investigation,
        kibanaUrl,
        spaceId,
        logger: context.logger,
        execute: (execution) => actionsClient.execute(execution),
      });
      await client.setNotifications(investigationId, result.notifications);

      return { output: { sent: result.sent, failed: result.failed } };
    },
  });
