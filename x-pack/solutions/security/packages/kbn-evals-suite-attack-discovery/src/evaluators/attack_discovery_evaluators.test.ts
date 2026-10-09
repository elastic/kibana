/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createAttackDiscoveryBasicEvaluator } from './attack_discovery_basic_evaluator';
import { createAttackDiscoveryRubricEvaluator } from './attack_discovery_rubric_evaluator';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from './types';

/**
 * A real `_find` doc as returned by the public `GET /api/attack_discovery/_find`
 * API (snake_case wire format) — the shape generateApi-mode tasks emit.
 */
const findApiDoc = {
  alert_ids: ['09d1f0b0-fa5e-11ee-987a-9f0a6b8b3c41'],
  details_markdown:
    '- **Alert names**: Malicious Instant Message Link Detection\n- **Host names**: {{ host.name WIN-JFK5HGG9M4R }}\n',
  entity_summary_markdown: '{{ host.name WIN-JFK5HGG9M4R }} / {{ user.name vagrant }}',
  mitre_attack_tactics: ['command-and-control', 'execution'],
  summary_markdown:
    'The {{ host.name WIN-JFK5HGG9M4R }} host downloaded a known malicious file after a user clicked an instant message link.',
  title: 'Malicious file downloaded from instant message link',
  timestamp: '2026-03-26T12:41:20.999Z',
};

const generateApiOutput: AttackDiscoveryTaskOutput = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insights: [findApiDoc] as any,
  raw: {
    execution_uuid: 'fec2a61d8ebb62f2',
    status: 'succeeded',
    alerts_context_count: 95,
    latency_ms: 168123,
  },
};

const run = async (
  evaluator: Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput>,
  output: AttackDiscoveryTaskOutput,
  expected: AttackDiscoveryDatasetExample['output']
) =>
  evaluator.evaluate({
    input: {} as AttackDiscoveryDatasetExample['input'],
    output,
    expected,
    metadata: {},
  });

describe('AttackDiscoveryBasic', () => {
  const evaluator = createAttackDiscoveryBasicEvaluator();

  it('scores snake_case generateApi `_find` docs as valid, not invalid_shape', async () => {
    const result = await run(evaluator, generateApiOutput, { attackDiscoveries: [] });
    expect(result.score).toBe(1);
    expect(result.label).toBe('ok');
  });

  it('scores camelCase direct-inference insights as valid', async () => {
    const result = await run(
      evaluator,
      {
        insights: [
          {
            alertIds: ['alert-1'],
            title: 'Title',
            summaryMarkdown: 'Summary',
            detailsMarkdown: 'Details',
          },
        ],
      },
      { attackDiscoveries: [] }
    );
    expect(result.score).toBe(1);
    expect(result.label).toBe('ok');
  });

  it('still returns invalid_shape for docs missing required fields in both shapes', async () => {
    const snake = await run(
      evaluator,
      { insights: [{ alert_ids: ['a'], title: 't' }] },
      {
        attackDiscoveries: [],
      }
    );
    expect(snake.label).toBe('invalid_shape');

    const camel = await run(
      evaluator,
      { insights: [{ alertIds: ['a'], title: 't' }] },
      {
        attackDiscoveries: [],
      }
    );
    expect(camel.label).toBe('invalid_shape');
  });

  it('returns missing_insights when there are no insights', async () => {
    const result = await run(evaluator, { insights: null }, { attackDiscoveries: [] });
    expect(result.score).toBe(0);
    expect(result.label).toBe('missing_insights');
  });
});

describe('AttackDiscoveryRubric (empty reference)', () => {
  it('returns a null score (not a structural zero) when the reference is empty', async () => {
    const evaluator = createAttackDiscoveryRubricEvaluator({
      // The judge must not be invoked at all in this case.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inferenceClient: undefined as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      log: undefined as any,
    });

    const result = await run(evaluator, generateApiOutput, { attackDiscoveries: [] });

    expect(result.score).toBeNull();
    expect(result.label).toBe('no_reference');
  });
});
