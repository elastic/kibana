/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
} from '@kbn/significant-events-schema';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { SLACK_MESSAGE_EVENT_ID, toSlackPlainText } from '@kbn/connector-specs';
import { isBoom, serverUnavailable } from '@hapi/boom';
import pRetry, { AbortError } from 'p-retry';
import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { NightshiftSettingsLocator } from '../../common/locators';
import { notifyInvestigationQuotaReached } from '../lib/notifications/notify_investigation_quota_reached';
import { DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID, toSlackThreadSubjectId } from '../../common';
import {
  triggerInvestigationStepCommonDefinition,
  triggerInvestigationStepInputSchema,
} from '../../common/workflows/steps/trigger_investigation';
import type {
  GetAlertsClient,
  GetAutomationsSoClient,
  GetEpisodeLookup,
  GetInvestigationsClient,
} from '../routes/types';
import { fetchInvestigationAlertSnapshots } from '../lib/alert_snapshot';
import {
  isScheduleOnlyAutomation,
  MANUAL_AUTOMATION_TRIGGER_SOURCE,
} from '../../common/automation_run';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../saved_objects/automation_saved_object';
import type { NightshiftAutomationAttributes } from '../lib/automations/types';
import { createAutomationBudget } from '../lib/automations/automation_budget';
import { AutomationDailyLimitReachedError, InvestigationQuotaDeniedError } from '../client/errors';
import type { AutomationBudget } from '../types';
import { alertIdentityOf, triggeringAlertOf, type NightshiftTelemetryClient } from '../telemetry';

const ALERT_VISIBILITY_RETRY_OPTIONS = { retries: 4, factor: 1, minTimeout: 500 } as const;

const resolveAlerts = async ({
  subjectId,
  request,
  spaceId,
  getAlertsClient,
  getEpisodeLookup,
}: {
  subjectId: string;
  request: KibanaRequest;
  spaceId: string;
  getAlertsClient: GetAlertsClient;
  getEpisodeLookup: GetEpisodeLookup;
}) => {
  const alertsClient = await getAlertsClient(request);
  if (!alertsClient) {
    throw serverUnavailable('Alert lookup is unavailable');
  }
  const episodeLookup = getEpisodeLookup(request, spaceId);
  return pRetry(async () => {
    try {
      return await fetchInvestigationAlertSnapshots({
        alertsClient,
        alertIds: [subjectId],
        ...episodeLookup,
      });
    } catch (error) {
      if (isBoom(error, 404)) throw error;
      throw new AbortError(error instanceof Error ? error : String(error));
    }
  }, ALERT_VISIBILITY_RETRY_OPTIONS);
};

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/** A Slack-triggered thread is summarized by its message: stored workflows still pass the automation name as `summary`. */
const toSubjectSummary = (
  input: z.infer<typeof triggerInvestigationStepInputSchema>,
  triggeredBy: string | undefined,
  event: unknown
): string | undefined => {
  if (input.subject_type !== 'slack_thread' || triggeredBy !== SLACK_MESSAGE_EVENT_ID) {
    return input.summary;
  }
  const text =
    typeof event === 'object' && event !== null && 'text' in event ? event.text : undefined;
  return nonEmptyString(toSlackPlainText(typeof text === 'string' ? text : undefined));
};

const toSubjectId = ({
  subject_type: subjectType,
  subject_id: subjectId,
  slack_thread: slackThread,
  message,
}: z.infer<typeof triggerInvestigationStepInputSchema>): string => {
  if (subjectType === 'slack_thread') {
    if (!slackThread) throw new Error('Slack thread investigations require slack_thread.');
    if (subjectId) {
      throw new Error('Slack thread investigations take their subject ID from slack_thread.');
    }
    if (!message?.trim()) throw new Error('Slack thread investigations require a message.');
    return toSlackThreadSubjectId(slackThread);
  }
  if (subjectType === 'manual') {
    if (!message?.trim()) throw new Error('Manual investigations require a message.');
    return subjectId ?? DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID;
  }
  if (!subjectId) {
    throw new Error('Alert and significant event investigations require a subject ID.');
  }
  return subjectId;
};

export const triggerInvestigationStepDefinition = (
  getInvestigationsClient: GetInvestigationsClient,
  getAutomationsSoClient: GetAutomationsSoClient,
  getAlertsClient: GetAlertsClient,
  getEpisodeLookup: GetEpisodeLookup,
  getActions: () => ActionsPluginStart | undefined,
  settingsLocator: NightshiftSettingsLocator,
  telemetry: NightshiftTelemetryClient
) =>
  createServerStepDefinition({
    ...triggerInvestigationStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      // getFakeRequest() does not carry space info, so the space ID must be extracted from the
      // workflow context explicitly. See https://github.com/elastic/kibana/issues/284786.
      const { workflow, kibanaUrl, execution, event } = context.contextManager.getContext();
      const spaceId = workflow.spaceId;
      const input = triggerInvestigationStepInputSchema.parse(context.input);
      let automationBudget: AutomationBudget | undefined;
      let isManualAutomationRun = false;
      if (input.automation_id) {
        const soClient = getAutomationsSoClient(request, spaceId);
        const { attributes: automation } = await soClient.get<NightshiftAutomationAttributes>(
          NIGHTSHIFT_AUTOMATION_SO_TYPE,
          input.automation_id
        );
        if (automation.workflowId !== workflow.id) {
          throw new Error('The automation does not belong to this workflow.');
        }
        // Public workflow inputs and metadata cannot grant manual accounting.
        isManualAutomationRun = execution.triggeredBy === MANUAL_AUTOMATION_TRIGGER_SOURCE;
        if (isManualAutomationRun && !isScheduleOnlyAutomation(automation)) {
          throw new Error(
            'Only automations with a schedule trigger and no other triggers can be run manually.'
          );
        }
        if (!isManualAutomationRun) {
          automationBudget = createAutomationBudget(
            soClient,
            input.automation_id,
            automation.runtime.dailyDispatchLimit
          );
        }
      }
      if (isManualAutomationRun && input.subject_type !== 'manual') {
        throw new Error('Manual automation runs require a manual question subject.');
      }
      const subjectId = toSubjectId(input);
      const client = getInvestigationsClient(request, spaceId);
      const alerts =
        input.subject_type === 'alert' && !input.context?.alerts
          ? await resolveAlerts({
              subjectId,
              request,
              spaceId,
              getAlertsClient,
              getEpisodeLookup,
            })
          : undefined;
      const significantEventData = alerts?.flatMap((snapshot) =>
        snapshot.alert_version === 'v2' &&
        snapshot.source === SIGNIFICANT_EVENTS_ALERT_SOURCE &&
        snapshot.data
          ? [snapshot.data]
          : []
      )[0];
      const alertTitle = nonEmptyString(significantEventData?.title)?.slice(0, MAX_TITLE_LENGTH);
      const sourceWorkflowExecutionId = nonEmptyString(
        significantEventData?.workflow_execution_id
      )?.slice(0, MAX_ID_LENGTH);
      const title =
        input.title && input.title !== subjectId ? input.title : (alertTitle ?? input.title);
      try {
        const result = await client.start(
          {
            subject: {
              type: input.subject_type,
              id: isManualAutomationRun ? DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID : subjectId,
              summary: toSubjectSummary(input, execution.triggeredBy, event),
            },
            title,
            trigger_type: isManualAutomationRun ? 'manual' : (input.trigger_type ?? 'automatic'),
            message: input.message,
            instructions:
              input.instructions ??
              (input.automation_id && input.subject_type === 'alert' ? input.message : undefined),
            context: alerts
              ? {
                  alerts,
                  ...(sourceWorkflowExecutionId
                    ? { source_workflow_execution_id: sourceWorkflowExecutionId }
                    : {}),
                }
              : input.context,
            timeout_seconds: input.timeout_seconds,
            notificationDestinations: input.notificationDestinations,
            slack_thread: input.slack_thread,
          },
          {
            automationBudget,
            automationId: input.automation_id,
            // A Slack thread subject means a Slack message started the run.
            entryPoint: input.subject_type === 'slack_thread' ? 'slack' : 'automation',
          }
        );
        return { output: result };
      } catch (error) {
        if (error instanceof AutomationDailyLimitReachedError) {
          context.logger.info(
            `Skipped investigation of ${input.subject_type}/${subjectId} for automation ${input.automation_id}: daily limit of ${error.limit} reached`
          );
          // Other subjects have no triggering alert: the client ignores any alerts they carry.
          const contextAlerts = input.context?.alerts;
          const suppliedAlerts = Array.isArray(contextAlerts)
            ? contextAlerts.filter(
                (alert): alert is Record<string, unknown> =>
                  alert != null && typeof alert === 'object' && !Array.isArray(alert)
              )
            : [];
          const alertIdentity =
            input.subject_type === 'alert'
              ? alertIdentityOf(spaceId, triggeringAlertOf(subjectId, alerts ?? suppliedAlerts))
              : {};
          const significantEventAlertId =
            alertIdentity.source_kind === 'significant_events'
              ? alertIdentity.fingerprint
              : undefined;
          telemetry.reportInvestigationSkipped({
            trigger: 'automation',
            origin: input.subject_type,
            automation_id: input.automation_id,
            skip_reason: 'automation_daily_limit',
            event_id:
              input.subject_type === 'significant_event' ? subjectId : significantEventAlertId,
            ...alertIdentity,
          });
          return { output: { skip_reason: 'daily_limit' as const, daily_limit: error.limit } };
        }
        if (error instanceof InvestigationQuotaDeniedError) {
          context.logger.info(
            `Skipped investigation of ${input.subject_type}/${subjectId}: ${error.message}`
          );
          if (input.slack_thread) {
            await notifyInvestigationQuotaReached({
              getSoClient: () => getAutomationsSoClient(request, spaceId),
              getActions,
              deniedBy: error.deniedBy,
              request,
              spaceId,
              slackThread: input.slack_thread,
              settingsLocator,
              kibanaUrl,
              limit: error.limit,
              signal: context.abortSignal,
              logger: context.logger,
            });
          }
          return { output: { skip_reason: 'investigation_limit' as const } };
        }
        throw error;
      }
    },
  });
