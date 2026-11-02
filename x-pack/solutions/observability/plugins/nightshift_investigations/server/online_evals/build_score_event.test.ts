/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildOnlineEvalScoreEvent,
  MAX_EXPLANATION_LENGTH,
  MAX_SCORE_EVENT_BYTES,
  type EvaluateResult,
  type OnlineEvalScoreMetadata,
} from './build_score_event';

const metadata: OnlineEvalScoreMetadata = {
  investigation_id: 'conv-1',
  round_id: 'round-1',
  round_trace_id: 'trace-round',
  judge_trace_id: 'trace-judge',
  workflow_execution_id: 'scoring-exec-1',
  investigation_execution_id: 'investigation-exec-1',
  space_id: 'default',
  agent_id: 'nightshift-investigator',
  evaluator_set: 'reference_free',
  round_kind: 'initial',
  graded_report: 'first_round',
  entry_point: 'automation',
  alert_rule_type: 'observability.rules.custom_threshold',
  judge_connector_id: 'judge-connector',
  investigation_started_at: '2026-10-28T10:00:00.000Z',
  investigation_ended_at: '2026-10-28T10:04:00.000Z',
  scoring_duration_ms: 5400,
};

const llmResult = (
  name: string,
  scores: NonNullable<EvaluateResult['scores']>
): EvaluateResult => ({
  status: 'ok',
  evaluator: {
    name,
    version: '1.0.0',
    kind: 'llm',
    model: { id: 'gpt-5', family: 'GPT', provider: 'Elastic' },
  },
  scores,
});

const errorResult = (name: string, error: EvaluateResult['error']): EvaluateResult => ({
  status: 'error',
  evaluator: { name, version: '2.0.0', kind: 'llm' },
  error,
});

const eventBytes = (event: object) => Buffer.byteLength(JSON.stringify(event), 'utf8');

describe('buildOnlineEvalScoreEvent', () => {
  const results = [
    llmResult('rca_quality', [
      { name: 'accuracy', score: 0.8, label: 'MOSTLY_CORRECT', explanation: 'Cause is right.' },
      { name: 'evidence', score: null, label: 'NOT_APPLICABLE' },
    ]),
    errorResult('investigation_process', { code: 'evidence_unmet', message: 'No tool calls' }),
    errorResult('conclusion_quality', { message: 'Judge timed out after quoting "secret"' }),
  ];

  it('carries the metadata, scores, counts and judge model, without explanations when the flag is off', () => {
    const event = buildOnlineEvalScoreEvent({ metadata, results, includeExplanations: false });

    expect(event).toEqual({
      ...metadata,
      judge_model: 'gpt-5',
      scores: [
        {
          evaluator_name: 'rca_quality',
          evaluator_version: '1.0.0',
          name: 'accuracy',
          value: 0.8,
          label: 'MOSTLY_CORRECT',
        },
        {
          evaluator_name: 'rca_quality',
          evaluator_version: '1.0.0',
          name: 'evidence',
          label: 'NOT_APPLICABLE',
        },
      ],
      evaluator_count: 3,
      failed_count: 1,
      skipped_count: 1,
      errors: [
        {
          evaluator_name: 'investigation_process',
          evaluator_version: '2.0.0',
          code: 'evidence_unmet',
        },
        {
          evaluator_name: 'conclusion_quality',
          evaluator_version: '2.0.0',
          code: 'evaluator_error',
        },
      ],
      explanations_included: false,
    });
  });

  it('includes explanations when the flag is on', () => {
    const event = buildOnlineEvalScoreEvent({ metadata, results, includeExplanations: true });

    expect(event.explanations_included).toBe(true);
    expect(event.scores[0].explanation).toBe('Cause is right.');
    expect(event.scores[1]).not.toHaveProperty('explanation');
  });

  it('never sends error messages, which can quote evidence', () => {
    const event = buildOnlineEvalScoreEvent({ metadata, results, includeExplanations: true });

    expect(JSON.stringify(event)).not.toContain('secret');
    expect(JSON.stringify(event)).not.toContain('No tool calls');
  });

  it('caps each explanation', () => {
    const event = buildOnlineEvalScoreEvent({
      metadata,
      results: [
        llmResult('rca_quality', [{ name: 'accuracy', score: 1, explanation: 'é'.repeat(2000) }]),
      ],
      includeExplanations: true,
    });

    const explanation = event.scores[0].explanation ?? '';
    expect(Array.from(explanation)).toHaveLength(MAX_EXPLANATION_LENGTH);
    expect(explanation.endsWith('…')).toBe(true);
  });

  it('omits the judge model when no evaluator resolved one', () => {
    const event = buildOnlineEvalScoreEvent({
      metadata,
      results: [errorResult('rca_quality', { message: 'Connector not found' })],
      includeExplanations: false,
    });

    expect(event).not.toHaveProperty('judge_model');
    expect(event.scores).toEqual([]);
    expect(event.failed_count).toBe(1);
  });

  it('drops explanations from the end until the event fits the shipper limit', () => {
    const scores = Array.from({ length: 4 }, (_, scoreIndex) => ({
      name: `score_${scoreIndex}`,
      score: 0.5,
      label: 'PARTIAL',
      explanation: '漢'.repeat(MAX_EXPLANATION_LENGTH),
    }));
    const event = buildOnlineEvalScoreEvent({
      metadata,
      results: ['a', 'b', 'c', 'd'].map((name) => llmResult(`judge_${name}`, scores)),
      includeExplanations: true,
    });

    expect(eventBytes(event)).toBeLessThanOrEqual(MAX_SCORE_EVENT_BYTES);
    expect(event.scores).toHaveLength(16);
    expect(event.explanations_dropped).toBeGreaterThan(0);
    expect(event.scores[0].explanation).toBeDefined();
    expect(event.scores[15]).not.toHaveProperty('explanation');
    expect(event).not.toHaveProperty('scores_dropped');
  });

  it('drops scores from the end when the event is still too large without explanations', () => {
    const scores = Array.from({ length: 60 }, (_, scoreIndex) => ({
      name: `${'n'.repeat(200)}_${scoreIndex}`,
      score: 1,
      label: 'L'.repeat(256),
    }));
    const event = buildOnlineEvalScoreEvent({
      metadata,
      results: [llmResult('verbose_judge', scores)],
      includeExplanations: false,
    });

    expect(eventBytes(event)).toBeLessThanOrEqual(MAX_SCORE_EVENT_BYTES);
    expect(event.scores_dropped).toBe(60 - event.scores.length);
    expect(event.scores[0].name).toBe(`${'n'.repeat(200)}_0`);
  });
});
