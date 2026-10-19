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
  EngineConfigUpdate,
  EngineRunSummary,
  LearningRunSummary,
} from '@kbn/significant-events-detection-engine-plugin/common';
import { useKibana } from './use_kibana';
import { getFormattedError } from '../util/errors';
import { DETECTION_ENGINE_QUERY_KEY } from './detection_engine_query_keys';

/** Actions the page can trigger; at most one runs at a time. */
export type DetectionEngineActionKey =
  | 'run'
  | 'autoRun'
  | 'replay'
  | 'config'
  | 'reset'
  | 'dismiss'
  | 'close'
  | 'verify'
  | 'confirm'
  | 'reportMissed'
  | 'learn'
  | 'approve'
  | 'reject'
  | 'retireNote';

interface IActionRequest {
  key: DetectionEngineActionKey;
  request: () => Promise<unknown>;
  /** Success toast text; no toast when it returns undefined. */
  describe?: (result: unknown) => string | undefined;
}

/** Contract of the page's actions, with the key of the one in flight. */
export interface IDetectionEngineActions {
  pendingAction: DetectionEngineActionKey | undefined;
  runEngine(): Promise<unknown>;
  /** Turns the server-side schedule on or off; it keeps running with the page closed. */
  setAutoRun(enabled: boolean): Promise<unknown>;
  replay(minutes: number): Promise<unknown>;
  updateConfig(config: EngineConfigUpdate): Promise<unknown>;
  /** Deletes what the engine produced in this space; settings, schedule and rules stay. */
  resetEngine(): Promise<unknown>;
  dismissEvent(params: {
    eventId: string;
    reason: DismissalReason;
    note?: string;
  }): Promise<unknown>;
  closeEvent(eventId: string): Promise<unknown>;
  verifyEvent(eventId: string): Promise<unknown>;
  /** Labels the event a real problem; every future change must keep catching it. */
  confirmEvent(params: { eventId: string; note?: string }): Promise<unknown>;
  /** Labels a problem the engine did not raise; the next learning pass looks for a detector. */
  reportMissed(params: {
    services: string[];
    from: string;
    to?: string;
    description: string;
  }): Promise<unknown>;
  runLearning(): Promise<unknown>;
  approveCandidate(candidateId: string): Promise<unknown>;
  /** Rejects a candidate, or rolls back one that is live. */
  rejectCandidate(params: { candidateId: string; reason?: string }): Promise<unknown>;
  retireNote(params: { noteId: string; reason: string }): Promise<unknown>;
}

function describeRun(result: unknown): string {
  const summary = result as EngineRunSummary;
  if (summary.skipped) {
    return summary.skipped;
  }
  if (summary.error) {
    return summary.error;
  }
  return i18n.translate('xpack.significantEventsApp.detectionEngine.runToast', {
    defaultMessage:
      'Evaluated up to {bucket}: {detections} detections, {calls} agent calls, {transitions} status changes, {open} open events.',
    values: {
      bucket: summary.bucket_end ? new Date(summary.bucket_end).toLocaleTimeString() : '-',
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
    core: { notifications },
    dependencies: {
      start: {
        significantEventsDetectionEngine: { repositoryClient: client },
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

    resetEngine: () =>
      act({
        key: 'reset',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/_reset', {
            signal: null,
          }),
        describe: () =>
          i18n.translate('xpack.significantEventsApp.detectionEngine.resetToast', {
            defaultMessage: 'Engine data deleted. The next run starts from fresh baselines.',
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

    confirmEvent: ({ eventId, note }) =>
      act({
        key: 'confirm',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/events/{id}/_confirm', {
            params: { path: { id: eventId }, body: { note } },
            signal: null,
          }),
        describe: () =>
          i18n.translate('xpack.significantEventsApp.detectionEngine.confirmToast', {
            defaultMessage:
              'Confirmed. It is now a kept incident every future change must catch, and memory the agent reads.',
          }),
      }),

    reportMissed: (incident) =>
      act({
        key: 'reportMissed',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/incidents', {
            params: { body: incident },
            signal: null,
          }),
        describe: () =>
          i18n.translate('xpack.significantEventsApp.detectionEngine.reportMissedToast', {
            defaultMessage:
              'Reported. The next learning pass looks for log patterns that would have caught it.',
          }),
      }),

    runLearning: () =>
      act({
        key: 'learn',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/learning/_run', {
            signal: null,
          }),
        describe: (result) => {
          const summary = result as LearningRunSummary;
          return summary.error
            ? summary.error
            : i18n.translate('xpack.significantEventsApp.detectionEngine.learnToast', {
                defaultMessage:
                  'Learning pass: {notes} memory notes, {proposed} candidates proposed, {advanced} moved on.',
                values: {
                  notes: summary.memory.added,
                  proposed: summary.candidates.proposed,
                  advanced: summary.candidates.advanced,
                },
              });
        },
      }),

    approveCandidate: (candidateId) =>
      act({
        key: 'approve',
        request: () =>
          client.fetch(
            'POST /internal/significant_events/detection_engine/candidates/{id}/_approve',
            { params: { path: { id: candidateId } }, signal: null }
          ),
      }),

    rejectCandidate: ({ candidateId, reason }) =>
      act({
        key: 'reject',
        request: () =>
          client.fetch(
            'POST /internal/significant_events/detection_engine/candidates/{id}/_reject',
            { params: { path: { id: candidateId }, body: { reason } }, signal: null }
          ),
      }),

    retireNote: ({ noteId, reason }) =>
      act({
        key: 'retireNote',
        request: () =>
          client.fetch('POST /internal/significant_events/detection_engine/memory/{id}/_retire', {
            params: { path: { id: noteId }, body: { reason } },
            signal: null,
          }),
      }),
  };
}
