/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftTelemetryClient } from './client';
import { trackBackgroundActivity } from './track_background_activity';

describe('trackBackgroundActivity', () => {
  const telemetry = { reportBackgroundActivity: jest.fn() };
  const ids = {
    telemetry: telemetry as unknown as NightshiftTelemetryClient,
    activity: 'decision_tree_reinforcement' as const,
    workflowExecutionId: 'optimize-exec-1',
    conversationId: 'inv-1',
    roundId: '',
  };

  beforeEach(() => {
    telemetry.reportBackgroundActivity.mockReset();
  });

  it('reports the summed usage of model calls and agent rounds', async () => {
    const result = await trackBackgroundActivity(ids, async (usage) => {
      usage.addModelProvider(() => ({
        calls: [
          {
            connectorId: 'eis-claude',
            model: 'claude-sonnet',
            tokens: { prompt: 100, completion: 10, thinking: 5, cached: 40, total: 115 },
          },
        ],
      }));
      usage.addRound({
        connector_id: 'eis-claude',
        llm_calls: 2,
        input_tokens: 300,
        output_tokens: 30,
        reasoning_tokens: 7,
      });
      return 'done';
    });

    expect(result).toBe('done');
    // An empty round id from Liquid is left off rather than reported.
    expect(telemetry.reportBackgroundActivity).toHaveBeenCalledWith({
      activity: 'decision_tree_reinforcement',
      outcome: 'success',
      workflow_execution_id: 'optimize-exec-1',
      conversation_id: 'inv-1',
      duration_ms: expect.any(Number),
      connector_id: 'eis-claude',
      model: 'claude-sonnet',
      llm_calls: 3,
      input_tokens: 400,
      // Thinking tokens count as output, as they do on Agent Builder rounds.
      output_tokens: 45,
      cached_input_tokens: 40,
      reasoning_tokens: 12,
    });
  });

  it('reports a failure and rethrows it', async () => {
    await expect(
      trackBackgroundActivity(ids, async () => {
        throw new Error('model unavailable');
      })
    ).rejects.toThrow('model unavailable');

    expect(telemetry.reportBackgroundActivity).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure', llm_calls: 0 })
    );
  });

  it('reports nothing for a job that finished without calling a model', async () => {
    await trackBackgroundActivity(ids, async () => undefined);

    expect(telemetry.reportBackgroundActivity).not.toHaveBeenCalled();
  });
});
