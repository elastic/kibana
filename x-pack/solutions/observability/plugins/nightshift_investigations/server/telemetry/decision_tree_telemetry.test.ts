/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE,
  NIGHTSHIFT_DECISION_TREE_WRITTEN_EVENT_TYPE,
} from './decision_tree_events';
import {
  createDecisionTreeTelemetry,
  registerDecisionTreeTelemetryEvents,
} from './decision_tree_telemetry';

describe('registerDecisionTreeTelemetryEvents', () => {
  it('registers both decision-tree event types', () => {
    const analytics = coreMock.createSetup().analytics;
    registerDecisionTreeTelemetryEvents(analytics);

    expect(analytics.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE })
    );
    expect(analytics.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: NIGHTSHIFT_DECISION_TREE_WRITTEN_EVENT_TYPE })
    );
  });
});

describe('createDecisionTreeTelemetry', () => {
  const setup = (conversationId?: string) => {
    const analytics = coreMock.createSetup().analytics;
    const logger = loggingSystemMock.createLogger();
    return {
      analytics,
      logger,
      telemetry: createDecisionTreeTelemetry({ analytics, conversationId, logger }),
    };
  };

  describe('reportLoaded', () => {
    it('emits which trees were loaded and how they were selected', () => {
      const { analytics, telemetry } = setup('conv-1');

      telemetry.reportLoaded({
        selection: 'discover',
        treeIds: ['symptom:checkout-latency', 'symptom:oom-kill'],
      });

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).toHaveBeenCalledWith(
        NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE,
        {
          conversation_id: 'conv-1',
          selection: 'discover',
          tree_count: 2,
          tree_ids: ['symptom:checkout-latency', 'symptom:oom-kill'],
        }
      );
    });

    // An empty store still means the run was hydrated, and that is the signal worth watching while
    // trees accumulate, so it gets an event of its own instead of silence.
    it('emits a zero-count event when no tree matched the selection', () => {
      const { analytics, telemetry } = setup('conv-1');

      telemetry.reportLoaded({ selection: 'accessed', treeIds: [] });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE,
        {
          conversation_id: 'conv-1',
          selection: 'accessed',
          tree_count: 0,
          tree_ids: [],
        }
      );
    });
  });

  describe('reportWritten', () => {
    it('emits one event per action with its tree count', () => {
      const { analytics, telemetry } = setup('conv-1');

      telemetry.reportWritten(['create', 'update', 'update', 'rejected']);

      expect(analytics.reportEvent).toHaveBeenCalledTimes(3);
      expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_DECISION_TREE_WRITTEN_EVENT_TYPE, {
        conversation_id: 'conv-1',
        action: 'create',
        tree_count: 1,
      });
      expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_DECISION_TREE_WRITTEN_EVENT_TYPE, {
        conversation_id: 'conv-1',
        action: 'update',
        tree_count: 2,
      });
      expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_DECISION_TREE_WRITTEN_EVENT_TYPE, {
        conversation_id: 'conv-1',
        action: 'rejected',
        tree_count: 1,
      });
    });

    it('emits nothing when no tree was written', () => {
      const { analytics, telemetry } = setup('conv-1');

      telemetry.reportWritten([]);

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });
  });

  // Hydration and reinforcement are worth more than the telemetry that measures them, so a
  // throwing analytics service must not take the surrounding run down with it.
  describe('when reporting throws', () => {
    it('swallows the error and keeps reporting the remaining buckets', () => {
      const { analytics, logger, telemetry } = setup('conv-1');
      analytics.reportEvent.mockImplementationOnce(() => {
        throw new Error('event type is not registered');
      });

      expect(() => telemetry.reportWritten(['create', 'update'])).not.toThrow();

      expect(analytics.reportEvent).toHaveBeenCalledTimes(2);
      expect(loggingSystemMock.collect(logger).debug).toEqual([
        ['Failed to report decision tree telemetry: Error: event type is not registered'],
      ]);
    });
  });

  // Liquid renders an absent workflow input as an empty string, which would otherwise be reported
  // as an empty keyword and break grouping in the dashboard.
  it('drops a conversation id the workflow did not supply', () => {
    const { analytics, telemetry } = setup('');

    telemetry.reportLoaded({ selection: 'discover', treeIds: ['symptom:oom-kill'] });

    expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE, {
      selection: 'discover',
      tree_count: 1,
      tree_ids: ['symptom:oom-kill'],
    });
  });
});
