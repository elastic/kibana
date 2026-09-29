/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import {
  decisionTreeWrittenEventType,
  decisionTreesLoadedEventType,
  NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE,
  NIGHTSHIFT_DECISION_TREE_WRITTEN_EVENT_TYPE,
  type DecisionTreeSelection,
  type DecisionTreeWriteAction,
  type DecisionTreeWrittenProps,
  type DecisionTreesLoadedProps,
} from './decision_tree_events';

export interface DecisionTreeTelemetry {
  reportLoaded: (params: {
    selection: DecisionTreeSelection;
    treeIds: readonly string[];
  }) => void;
  reportWritten: (actions: readonly DecisionTreeWriteAction[]) => void;
}

export const registerDecisionTreeTelemetryEvents = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType(decisionTreesLoadedEventType);
  analytics.registerEventType(decisionTreeWrittenEventType);
};

/**
 * Binds the ids of one run to the decision-tree events emitted during it. The write event is
 * bucketed by action rather than emitted per tree so a large batch cannot flood the pipeline.
 */
export const createDecisionTreeTelemetry = ({
  analytics,
  conversationId,
  logger,
}: {
  analytics: AnalyticsServiceSetup;
  conversationId?: string;
  logger: Logger;
}): DecisionTreeTelemetry => {
  // Liquid renders an absent workflow input as an empty string, so a falsy id is dropped rather
  // than reported as an empty keyword that would break grouping.
  const runIds = conversationId ? { conversation_id: conversationId } : {};

  // Measuring the run must never cost the run, so a reporting failure is swallowed. `reportEvent`
  // throws on an unregistered event type, and in dev also on a payload the schema rejects.
  const report = (emit: () => void): void => {
    try {
      emit();
    } catch (error) {
      logger.debug(`Failed to report decision tree telemetry: ${error}`);
    }
  };

  return {
    reportLoaded: ({ selection, treeIds }) => {
      report(() =>
        analytics.reportEvent<DecisionTreesLoadedProps>(
          NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE,
          {
            ...runIds,
            selection,
            tree_count: treeIds.length,
            tree_ids: [...treeIds],
          }
        )
      );
    },

    reportWritten: (actions) => {
      const counts = new Map<DecisionTreeWriteAction, number>();
      for (const action of actions) {
        counts.set(action, (counts.get(action) ?? 0) + 1);
      }

      for (const [action, count] of counts) {
        report(() =>
          analytics.reportEvent<DecisionTreeWrittenProps>(
            NIGHTSHIFT_DECISION_TREE_WRITTEN_EVENT_TYPE,
            {
              ...runIds,
              action,
              tree_count: count,
            }
          )
        );
      }
    },
  };
};
