/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  DismissalReason,
  EngineConfig,
  EngineRunSummary,
  LabIncidentKind,
} from '@kbn/significant-events-plugin/common';
import { useKibana } from './use_kibana';
import { getFormattedError } from '../util/errors';
import { DETECTION_ENGINE_QUERY_KEY } from './detection_engine_query_keys';

/** Actions the page can trigger; at most one runs at a time. */
export type DetectionEngineActionKey =
  | 'run'
  | 'autoRun'
  | 'replay'
  | 'config'
  | 'labSetup'
  | 'labIncident'
  | 'labStop'
  | 'labReset'
  | 'customerRule'
  | 'dismiss'
  | 'close'
  | 'verify';

interface IActionRequest {
  key: DetectionEngineActionKey;
  request: () => Promise<unknown>;
  /** Success toast text; no toast when it returns undefined. */
  describe?: (result: unknown) => string | undefined;
}

/** Index the lab writes to; the customer rule watches it. */
const LAB_INDEX = 'logs-detectionlab-default';

/** Contract of the page's actions, with the key of the one in flight. */
export interface IDetectionEngineActions {
  pendingAction: DetectionEngineActionKey | undefined;
  runEngine(): Promise<unknown>;
  /** Turns the server-side schedule on or off; it keeps running with the page closed. */
  setAutoRun(enabled: boolean): Promise<unknown>;
  replay(minutes: number): Promise<unknown>;
  updateConfig(config: Partial<EngineConfig>): Promise<unknown>;
  setupLab(): Promise<unknown>;
  startIncident(params: { kind: LabIncidentKind; service: string }): Promise<unknown>;
  stopIncident(id?: string): Promise<unknown>;
  resetLab(): Promise<unknown>;
  /** Creates a real Kibana ES query rule, as a customer would, over the lab's logs. */
  createCustomerRule(service: string): Promise<unknown>;
  dismissEvent(params: {
    eventId: string;
    reason: DismissalReason;
    note?: string;
  }): Promise<unknown>;
  closeEvent(eventId: string): Promise<unknown>;
  verifyEvent(eventId: string): Promise<unknown>;
}

function describeRun(result: unknown): string {
  const summary = result as EngineRunSummary;
  if (summary.skipped) {
    return summary.skipped;
  }
  return i18n.translate('xpack.significantEventsApp.detectionEngine.runToast', {
    defaultMessage:
      'Evaluated {bucket}: {detections} detections, {calls} agent calls, {transitions} status changes, {open} open events.',
    values: {
      bucket: new Date(summary.bucket_start).toLocaleTimeString(),
      detections: summary.detections,
      calls: summary.agent.calls,
      transitions: summary.transitions.length,
      open: summary.open_events,
    },
  });
}

/** The detection engine page's actions, each refreshing every engine query when done. */
export function useDetectionEngineActions(): IDetectionEngineActions {
  const {
    core: { http, notifications },
    dependencies: {
      start: {
        significantEvents: { significantEventsRepositoryClient: client },
      },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, IActionRequest>({
    mutationFn: ({ request }) => request(),
    onSuccess: (result, { describe }) => {
      const message = describe?.(result);
      if (message) {
        notifications.toasts.addSuccess(message);
      }
      return queryClient.invalidateQueries({ queryKey: DETECTION_ENGINE_QUERY_KEY });
    },
    onError: (error) => {
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.significantEventsApp.detectionEngine.actionFailed', {
          defaultMessage: 'Detection engine action failed',
        }),
      });
    },
  });

  const act = (request: IActionRequest) => mutation.mutateAsync(request).catch(() => undefined);

  return {
    pendingAction: mutation.isLoading ? mutation.variables?.key : undefined,

    runEngine: () =>
      act({
        key: 'run',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/_run', { signal: null }),
        describe: describeRun,
      }),

    setAutoRun: (enabled) =>
      act({
        key: 'autoRun',
        request: () =>
          client.fetch('PUT /internal/significant_events/detection_engine/auto_run', {
            params: { body: { enabled } },
            signal: null,
          }),
        describe: (result) => {
          const state = result as { enabled: boolean; error?: string };
          if (state.error) {
            return state.error;
          }
          return state.enabled
            ? i18n.translate('xpack.significantEventsApp.detectionEngine.autoRunOnToast', {
                defaultMessage:
                  'Auto-run is on. A workflow evaluates every minute on the server, even with this page closed.',
              })
            : i18n.translate('xpack.significantEventsApp.detectionEngine.autoRunOffToast', {
                defaultMessage: 'Auto-run is off. The engine only runs when you press Run now.',
              });
        },
      }),

    replay: (minutes) =>
      act({
        key: 'replay',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/_replay', {
            params: { body: { minutes } },
            signal: null,
          }),
        describe: () =>
          i18n.translate('xpack.significantEventsApp.detectionEngine.replayToast', {
            defaultMessage:
              'Replayed the last {minutes} minutes. Baselines are updated; see the activity log for what each strategy would have raised.',
            values: { minutes },
          }),
      }),

    updateConfig: (config) =>
      act({
        key: 'config',
        request: () =>
          client.fetch('PUT /internal/significant_events/detection_engine/config', {
            params: { body: config },
            signal: null,
          }),
      }),

    setupLab: () =>
      act({
        key: 'labSetup',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/lab/_setup', {
            signal: null,
          }),
        describe: () =>
          i18n.translate('xpack.significantEventsApp.detectionEngine.labReadyToast', {
            defaultMessage:
              'Lab ready: three hours of logs, a source, its knowledge, and baselines from a replay.',
          }),
      }),

    startIncident: (params) =>
      act({
        key: 'labIncident',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/lab/_incident', {
            params: { body: params },
            signal: null,
          }),
        describe: () =>
          i18n.translate('xpack.significantEventsApp.detectionEngine.incidentToast', {
            defaultMessage:
              'Incident started. The engine sees it once the current one-minute bucket completes.',
          }),
      }),

    stopIncident: (id) =>
      act({
        key: 'labStop',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/lab/_stop', {
            params: { body: { id } },
            signal: null,
          }),
      }),

    resetLab: () =>
      act({
        key: 'labReset',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/lab/_reset', {
            signal: null,
          }),
      }),

    createCustomerRule: (service) =>
      act({
        key: 'customerRule',
        request: () =>
          http.post('/api/alerting/rule', {
            body: JSON.stringify({
              name: `[Lab] ${service} 5xx errors`,
              rule_type_id: '.es-query',
              consumer: 'observability',
              schedule: { interval: '1m' },
              tags: [`service:${service}`, 'detection-lab'],
              actions: [],
              params: {
                searchType: 'esQuery',
                index: [LAB_INDEX],
                timeField: '@timestamp',
                esQuery: JSON.stringify({
                  query: {
                    bool: {
                      filter: [
                        { term: { 'service.name': service } },
                        { range: { 'http.response.status_code': { gte: 500 } } },
                      ],
                    },
                  },
                }),
                threshold: [5],
                thresholdComparator: '>',
                timeWindowSize: 2,
                timeWindowUnit: 'm',
                size: 10,
                aggType: 'count',
                groupBy: 'all',
                excludeHitsFromPreviousRun: false,
              },
            }),
          }),
        describe: () =>
          i18n.translate('xpack.significantEventsApp.detectionEngine.customerRuleToast', {
            defaultMessage:
              'Created the Kibana rule "[Lab] {service} 5xx errors". It fires on its own schedule; the Customer alerts strategy reads it.',
            values: { service },
          }),
      }),

    dismissEvent: ({ eventId, reason, note }) =>
      act({
        key: 'dismiss',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/events/{id}/_dismiss', {
            params: { path: { id: eventId }, body: { reason, note } },
            signal: null,
          }),
        describe: () =>
          i18n.translate('xpack.significantEventsApp.detectionEngine.dismissToast', {
            defaultMessage:
              'Dismissed. The event stays quiet until the problem gets worse, and the reason is now memory the agent reads.',
          }),
      }),

    closeEvent: (eventId) =>
      act({
        key: 'close',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/events/{id}/_close', {
            params: { path: { id: eventId } },
            signal: null,
          }),
      }),

    verifyEvent: (eventId) =>
      act({
        key: 'verify',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/events/{id}/_verify', {
            params: { path: { id: eventId } },
            signal: null,
          }),
        describe: (result) =>
          (result as { verification?: { details: string } }).verification?.details,
      }),
  };
}
