/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  DiagnosticsContext,
  WorkflowExecutionTracking,
  WorkflowExecutionsTracking,
} from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';

import { ATTACK_DISCOVERY_EVENT_PROVIDER } from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';

export type EventLogData = WorkflowExecutionsTracking & {
  diagnosticsContext?: DiagnosticsContext;
  /**
   * Pre-provided alert strings stored in the generate-step-started event reference.
   * Available during the running state (before step.input is populated by the engine).
   */
  providedAlerts?: string[];
};

/**
 * Queries the event log for the WorkflowExecutionsTracking associated with
 * a given execution UUID.
 *
 * The tracking data is stored in the `event.reference` field (as JSON) of
 * events written during the manual orchestration flow. Each alert retrieval
 * workflow writes its own separate event, so we must read ALL events and
 * merge their `alertRetrieval` arrays to capture every workflow (including
 * failed ones). `generation` and `validation` are taken from the most recent
 * event that contains them (hits are sorted descending by timestamp).
 *
 * @returns The parsed WorkflowExecutionsTracking, or null if not found.
 */
export const getWorkflowExecutionsTracking = async ({
  esClient,
  eventLogIndex,
  executionId,
}: {
  esClient: ElasticsearchClient;
  eventLogIndex: string;
  executionId: string;
}): Promise<EventLogData | null> => {
  const searchResult = await esClient.search({
    index: eventLogIndex,
    query: {
      bool: {
        filter: [
          { term: { 'event.provider': ATTACK_DISCOVERY_EVENT_PROVIDER } },
          { term: { 'kibana.alert.rule.execution.uuid': executionId } },
          { exists: { field: 'event.reference' } },
        ],
      },
    },
    size: 100,
    sort: [{ '@timestamp': { order: 'desc' as const } }],
  });

  const hits = searchResult.hits.hits;

  if (hits.length === 0) {
    return null;
  }

  // Merge alertRetrieval across all events (dedup by workflowRunId).
  // generation / validation / diagnosticsContext / providedAlerts are taken from the
  // most recent event that has them (hits are sorted descending, so the first match wins).
  interface TrackingAccumulator {
    diagnosticsContext: DiagnosticsContext | undefined;
    foundAnyValidEvent: boolean;
    generation: WorkflowExecutionsTracking['generation'];
    mergedAlertRetrieval: Map<string, WorkflowExecutionTracking>;
    providedAlerts: string[] | undefined;
    validation: WorkflowExecutionsTracking['validation'];
  }

  const {
    diagnosticsContext,
    foundAnyValidEvent,
    generation,
    mergedAlertRetrieval,
    providedAlerts,
    validation,
  } = hits.reduce<TrackingAccumulator>(
    (acc, hit) => {
      const source = hit._source as {
        event?: {
          reference?: string;
        };
      };

      const reference = source?.event?.reference;

      if (reference == null) {
        return acc;
      }

      try {
        const parsed = JSON.parse(reference) as Record<string, unknown>;

        // Merge alertRetrieval entries into the shared Map (dedup by workflowRunId)
        const alertRetrievalArray = parsed.alertRetrieval as
          | WorkflowExecutionTracking[]
          | null
          | undefined;

        if (Array.isArray(alertRetrievalArray)) {
          for (const ref of alertRetrievalArray) {
            if (!acc.mergedAlertRetrieval.has(ref.workflowRunId)) {
              acc.mergedAlertRetrieval.set(ref.workflowRunId, ref);
            }
          }
        }

        // Normalize legacy "orchestrator" key to "generation" for backward compatibility
        const rawGeneration =
          parsed.generation ?? (parsed.orchestrator as WorkflowExecutionsTracking['generation']);

        // Take generation / validation / diagnosticsContext / providedAlerts from the most
        // recent event (first match wins, hits sorted descending by timestamp)
        return {
          ...acc,
          diagnosticsContext:
            acc.diagnosticsContext ??
            (parsed.diagnosticsContext != null
              ? (parsed.diagnosticsContext as DiagnosticsContext)
              : undefined),
          foundAnyValidEvent: true,
          generation:
            acc.generation ?? (rawGeneration as WorkflowExecutionsTracking['generation']) ?? null,
          providedAlerts:
            acc.providedAlerts ??
            (Array.isArray(parsed.providedAlerts)
              ? (parsed.providedAlerts as string[])
              : undefined),
          validation:
            acc.validation ??
            (parsed.validation as WorkflowExecutionsTracking['validation']) ??
            null,
        };
      } catch {
        // Skip events with invalid JSON in event.reference
        return acc;
      }
    },
    {
      diagnosticsContext: undefined,
      foundAnyValidEvent: false,
      generation: null,
      mergedAlertRetrieval: new Map<string, WorkflowExecutionTracking>(),
      providedAlerts: undefined,
      validation: null,
    }
  );

  if (!foundAnyValidEvent) {
    return null;
  }

  const base: WorkflowExecutionsTracking = {
    alertRetrieval:
      mergedAlertRetrieval.size > 0 ? Array.from(mergedAlertRetrieval.values()) : null,
    generation,
    validation,
  };

  if (diagnosticsContext != null || providedAlerts != null) {
    return {
      ...base,
      ...(diagnosticsContext != null ? { diagnosticsContext } : {}),
      ...(providedAlerts != null ? { providedAlerts } : {}),
    };
  }

  return base;
};
