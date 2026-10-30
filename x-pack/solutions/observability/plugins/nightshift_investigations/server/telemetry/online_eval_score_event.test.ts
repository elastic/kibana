/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAnalytics } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import { buildOnlineEvalScoreEvent, type EvaluateResult } from '../online_evals/build_score_event';
import {
  NIGHTSHIFT_ONLINE_EVAL_SCORE_EVENT,
  onlineEvalScoreEvent,
} from './online_eval_score_event';

const results: EvaluateResult[] = [
  {
    status: 'ok',
    evaluator: { name: 'rca_quality', version: '1.0.0', kind: 'llm', model: { id: 'gpt-5' } },
    scores: [
      { name: 'accuracy', score: 0.75, label: 'MOSTLY_CORRECT', explanation: 'x'.repeat(4000) },
      { name: 'evidence', score: null },
    ],
  },
  {
    status: 'error',
    evaluator: { name: 'investigation_process', version: '1.0.0', kind: 'llm' },
    error: { code: 'evidence_unmet', message: 'No tool calls' },
  },
];

const metadata = {
  investigation_id: 'conv-1',
  round_id: 'round-1',
  workflow_execution_id: 'scoring-exec-1',
  space_id: 'default',
  evaluator_set: 'reference_free',
  round_kind: 'initial' as const,
  graded_report: 'first_round' as const,
  investigation_started_at: '2026-10-28T10:00:00.000Z',
  scoring_duration_ms: 5400,
};

describe('onlineEvalScoreEvent schema', () => {
  // A dev-mode analytics client validates every reported event against its registered schema.
  const createRegisteredAnalytics = () => {
    const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
    analytics.registerEventType(onlineEvalScoreEvent);
    return analytics;
  };

  it.each([true, false])('accepts a built event with explanations included: %s', (include) => {
    const analytics = createRegisteredAnalytics();
    const event = buildOnlineEvalScoreEvent({ metadata, results, includeExplanations: include });

    expect(() => analytics.reportEvent(NIGHTSHIFT_ONLINE_EVAL_SCORE_EVENT, event)).not.toThrow();
  });

  it('rejects an event without its required metadata', () => {
    const analytics = createRegisteredAnalytics();
    const { round_id: _roundId, ...event } = buildOnlineEvalScoreEvent({
      metadata,
      results,
      includeExplanations: false,
    });

    expect(() => analytics.reportEvent(NIGHTSHIFT_ONLINE_EVAL_SCORE_EVENT, event)).toThrow(
      /round_id/
    );
  });
});
