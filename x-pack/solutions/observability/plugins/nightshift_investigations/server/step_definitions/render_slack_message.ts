/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { MAX_KEYWORD_LENGTH } from '../../common';
import type { InvestigationLocator } from '../../common/locators';
import type { GetInvestigationsClient } from '../routes/types';
import { notificationPhaseSchema } from '../lib/notifications/notification_routing';
import { renderInvestigationSlackMessage } from '../lib/notifications/format_investigation_slack_message';

const inputSchema = lazySchema(() =>
  z.object({
    investigation_id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    phase: notificationPhaseSchema,
    reason: z.string().max(MAX_TEXT_LENGTH).optional(),
  })
);

/**
 * Renders an investigation's lifecycle message for Slack the way Nightshift notifications do, for
 * workflows that post it themselves with `slack2.sendMessage` or `slack2.updateMessage`.
 */
export const renderSlackMessageStepDefinition = ({
  investigationLocator,
  getInvestigationsClient,
}: {
  investigationLocator: Pick<InvestigationLocator, 'getRedirectUrl'>;
  getInvestigationsClient: GetInvestigationsClient;
}) =>
  createServerStepDefinition({
    id: 'nightshift.renderSlackMessage',
    label: 'Render Nightshift Slack message',
    category: StepCategory.Ai,
    description:
      'Renders an investigation lifecycle message as Slack Block Kit blocks with fallback text.',
    inputSchema,
    outputSchema: z.object({
      text: z.string().describe('Fallback and notification text'),
      blocks: z.array(z.looseObject({ type: z.string() })).describe('Slack Block Kit blocks'),
    }),
    handler: async (context) => {
      const {
        kibanaUrl,
        workflow: { spaceId },
      } = context.contextManager.getContext();
      const { investigation_id: investigationId, phase, reason } = inputSchema.parse(context.input);
      const investigation = await getInvestigationsClient(
        context.contextManager.getFakeRequest(),
        spaceId
      ).getNotifiableInvestigation(investigationId);
      return {
        output: renderInvestigationSlackMessage({
          investigation,
          url: new URL(
            investigationLocator.getRedirectUrl({ investigationId }, { spaceId }),
            kibanaUrl
          ).toString(),
          phase,
          reason,
        }),
      };
    },
  });
