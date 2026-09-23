/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  NIGHTSHIFT_CORTEX_EDIT_APPLIED_EVENT_TYPE,
  NIGHTSHIFT_CORTEX_HYDRATED_EVENT_TYPE,
} from './cortex_events';
import { createCortexTelemetry, registerCortexTelemetryEvents } from './cortex_telemetry';

describe('registerCortexTelemetryEvents', () => {
  it('registers both Cortex event types', () => {
    const analytics = coreMock.createSetup().analytics;
    registerCortexTelemetryEvents(analytics);

    expect(analytics.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: NIGHTSHIFT_CORTEX_HYDRATED_EVENT_TYPE })
    );
    expect(analytics.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: NIGHTSHIFT_CORTEX_EDIT_APPLIED_EVENT_TYPE })
    );
  });
});

describe('createCortexTelemetry', () => {
  const setup = (ids: { conversationId?: string; roundId?: string }) => {
    const analytics = coreMock.createSetup().analytics;
    const logger = loggingSystemMock.createLogger();
    return { analytics, logger, telemetry: createCortexTelemetry({ analytics, ...ids, logger }) };
  };

  describe('reportHydrated', () => {
    it('emits one event per entity type with its page count', () => {
      const { analytics, telemetry } = setup({ conversationId: 'conv-1' });

      telemetry.reportHydrated([
        { entity_type: 'service' },
        { entity_type: 'service' },
        { entity_type: 'runbook' },
      ]);

      expect(analytics.reportEvent).toHaveBeenCalledTimes(2);
      expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_CORTEX_HYDRATED_EVENT_TYPE, {
        conversation_id: 'conv-1',
        entity_type: 'service',
        page_count: 2,
      });
      expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_CORTEX_HYDRATED_EVENT_TYPE, {
        conversation_id: 'conv-1',
        entity_type: 'runbook',
        page_count: 1,
      });
    });

    // An empty wiki is the state Cortex starts in, so hydration still has to show up.
    it('emits a zero-count event when the wiki is empty', () => {
      const { analytics, telemetry } = setup({ conversationId: 'conv-1' });

      telemetry.reportHydrated([]);

      expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_CORTEX_HYDRATED_EVENT_TYPE, {
        conversation_id: 'conv-1',
        page_count: 0,
      });
    });
  });

  describe('reportEditsApplied', () => {
    it('emits one event per action and entity type', () => {
      const { analytics, telemetry } = setup({
        conversationId: 'conv-1',
        roundId: 'round-1',
      });

      telemetry.reportEditsApplied([
        { action: 'upsert', entityType: 'service' },
        { action: 'upsert', entityType: 'service' },
        { action: 'archive', entityType: 'service' },
        { action: 'upsert', entityType: 'topic' },
      ]);

      expect(analytics.reportEvent).toHaveBeenCalledTimes(3);
      expect(analytics.reportEvent).toHaveBeenCalledWith(
        NIGHTSHIFT_CORTEX_EDIT_APPLIED_EVENT_TYPE,
        {
          conversation_id: 'conv-1',
          round_id: 'round-1',
          action: 'upsert',
          entity_type: 'service',
          edit_count: 2,
        }
      );
      expect(analytics.reportEvent).toHaveBeenCalledWith(
        NIGHTSHIFT_CORTEX_EDIT_APPLIED_EVENT_TYPE,
        {
          conversation_id: 'conv-1',
          round_id: 'round-1',
          action: 'archive',
          entity_type: 'service',
          edit_count: 1,
        }
      );
      expect(analytics.reportEvent).toHaveBeenCalledWith(
        NIGHTSHIFT_CORTEX_EDIT_APPLIED_EVENT_TYPE,
        {
          conversation_id: 'conv-1',
          round_id: 'round-1',
          action: 'upsert',
          entity_type: 'topic',
          edit_count: 1,
        }
      );
    });

    it('emits nothing when no edit changed a page', () => {
      const { analytics, telemetry } = setup({ conversationId: 'conv-1' });

      telemetry.reportEditsApplied([]);

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });
  });

  // Hydration and optimization are worth more than the telemetry that measures them, so a
  // throwing analytics service must not take the surrounding run down with it.
  describe('when reporting throws', () => {
    it('swallows the error and keeps reporting the remaining buckets', () => {
      const { analytics, logger, telemetry } = setup({ conversationId: 'conv-1' });
      analytics.reportEvent.mockImplementationOnce(() => {
        throw new Error('event type is not registered');
      });

      expect(() =>
        telemetry.reportHydrated([{ entity_type: 'service' }, { entity_type: 'runbook' }])
      ).not.toThrow();

      expect(analytics.reportEvent).toHaveBeenCalledTimes(2);
      expect(loggingSystemMock.collect(logger).debug).toEqual([
        ['Failed to report Cortex telemetry: Error: event type is not registered'],
      ]);
    });

    it('swallows the error when an edit event fails', () => {
      const { analytics, telemetry } = setup({ conversationId: 'conv-1' });
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() =>
        telemetry.reportEditsApplied([{ action: 'upsert', entityType: 'service' }])
      ).not.toThrow();
    });
  });

  // Liquid renders an absent workflow input as an empty string, which would otherwise be reported
  // as an empty keyword and break grouping in the dashboard.
  it('drops ids the workflow did not supply', () => {
    const { analytics, telemetry } = setup({ roundId: '', conversationId: 'conv-1' });

    telemetry.reportHydrated([{ entity_type: 'service' }]);

    expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_CORTEX_HYDRATED_EVENT_TYPE, {
      conversation_id: 'conv-1',
      entity_type: 'service',
      page_count: 1,
    });
  });
});
