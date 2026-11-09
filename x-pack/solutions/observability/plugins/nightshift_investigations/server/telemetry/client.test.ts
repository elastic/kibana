/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { setupNightshiftTelemetry } from '.';
import {
  NIGHTSHIFT_SEMANTIC_MEMORY_MATERIALIZED_EVENT,
  NIGHTSHIFT_SEMANTIC_MEMORY_OPTIMIZED_EVENT,
} from './events';
import { NIGHTSHIFT_ONLINE_EVAL_SCORE_EVENT } from './online_eval_score_event';

describe('NightshiftTelemetryClient', () => {
  const logger = loggerMock.create();
  const analytics = {
    registerEventType: jest.fn(),
    reportEvent: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers and reports the two aggregate Semantic Memory events', () => {
    const client = setupNightshiftTelemetry({ analytics: analytics as never, logger });

    expect(analytics.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: NIGHTSHIFT_SEMANTIC_MEMORY_MATERIALIZED_EVENT })
    );
    expect(analytics.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: NIGHTSHIFT_SEMANTIC_MEMORY_OPTIMIZED_EVENT })
    );

    client.reportSemanticMemoryMaterialized({
      agent_id: 'agent-1',
      conversation_id: 'conv-1',
      workflow_execution_id: 'exec-1',
      outcome: 'success',
      recalled_count: 2,
    });
    client.reportSemanticMemoryOptimized({
      agent_id: 'agent-1',
      conversation_id: 'conv-1',
      round_id: 'round-1',
      workflow_execution_id: 'exec-2',
      outcome: 'success',
      useful_count: 1,
    });

    expect(analytics.reportEvent).toHaveBeenNthCalledWith(
      1,
      NIGHTSHIFT_SEMANTIC_MEMORY_MATERIALIZED_EVENT,
      expect.objectContaining({ recalled_count: 2 })
    );
    expect(analytics.reportEvent).toHaveBeenNthCalledWith(
      2,
      NIGHTSHIFT_SEMANTIC_MEMORY_OPTIMIZED_EVENT,
      expect.objectContaining({ useful_count: 1 })
    );
  });

  it('registers and reports the online eval score event', () => {
    const client = setupNightshiftTelemetry({ analytics: analytics as never, logger });

    expect(analytics.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: NIGHTSHIFT_ONLINE_EVAL_SCORE_EVENT })
    );

    const event = {
      investigation_id: 'conv-1',
      round_id: 'round-1',
      workflow_execution_id: 'exec-1',
      space_id: 'default',
      evaluator_set: 'reference_free',
      round_kind: 'initial' as const,
      graded_report: 'first_round' as const,
      scores: [{ evaluator_name: 'rca_quality', evaluator_version: '1.0.0', name: 'q', value: 1 }],
      evaluator_count: 1,
      failed_count: 0,
      skipped_count: 0,
      errors: [],
      explanations_included: false,
      investigation_started_at: '2026-10-28T10:00:00.000Z',
      scoring_duration_ms: 1200,
    };
    client.reportOnlineEvalScore(event);

    expect(analytics.reportEvent).toHaveBeenCalledWith(NIGHTSHIFT_ONLINE_EVAL_SCORE_EVENT, event);
  });

  it('never fails the product operation when analytics reporting throws', () => {
    analytics.reportEvent.mockImplementation(() => {
      throw new Error('telemetry unavailable');
    });
    const client = setupNightshiftTelemetry({ analytics: analytics as never, logger });

    expect(() =>
      client.reportSemanticMemoryMaterialized({
        agent_id: 'agent-1',
        workflow_execution_id: 'exec-1',
        outcome: 'failure',
      })
    ).not.toThrow();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to report'),
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
