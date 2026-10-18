/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeUntilValid } from '@kbn/inference-prompt-utils';
import type { Evaluator } from '@kbn/evals';
import { createAttackDiscoveryBasicEvaluator } from './attack_discovery_basic_evaluator';
import { createAttackDiscoveryRubricEvaluator } from './attack_discovery_rubric_evaluator';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';

jest.mock('@kbn/inference-prompt-utils', () => ({
  executeUntilValid: jest.fn(),
}));

const executeUntilValidMock = executeUntilValid as jest.MockedFunction<typeof executeUntilValid>;

const gradeResponse = (verdict: 'Y' | 'N', explanation: string) =>
  ({
    content: '',
    toolCalls: [
      { toolCallId: 'call-1', function: { name: 'grade', arguments: { verdict, explanation } } },
    ],
    input: [],
  } as unknown as Awaited<ReturnType<typeof executeUntilValid>>);

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

/**
 * An insight with every field empty — the shell the rubric graded 1/Y against a
 * fabricated empty reference.
 */
const emptyInsightShell = {
  alert_ids: [],
  details_markdown: '',
  entity_summary_markdown: '',
  mitre_attack_tactics: [],
  summary_markdown: '',
  title: '',
};

const referencedDiscovery = {
  alertIds: ['alert-1'],
  detailsMarkdown: 'Emotet infection chain on {{ host.name win-1 }}',
  entitySummaryMarkdown: '{{ host.name win-1 }}',
  mitreAttackTactics: ['execution'],
  summaryMarkdown: 'Office maldoc spawned regsvr32.',
  title: 'Emotet: Office maldoc to regsvr32 execution',
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

const rubricEvaluator = () =>
  createAttackDiscoveryRubricEvaluator({
    // The judge must not be invoked on the empty-reference path.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inferenceClient: undefined as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log: undefined as any,
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
      {
        insights: [
          { alert_ids: ['a'], title: 't' },
        ] as unknown as AttackDiscoveryTaskOutput['insights'],
      },
      {
        attackDiscoveries: [],
      }
    );
    expect(snake.label).toBe('invalid_shape');

    const camel = await run(
      evaluator,
      {
        insights: [
          { alertIds: ['a'], title: 't' },
        ] as unknown as AttackDiscoveryTaskOutput['insights'],
      },
      {
        attackDiscoveries: [],
      }
    );
    expect(camel.label).toBe('invalid_shape');
  });

  it.each([[null], [undefined], [0], [false], ['']])(
    'returns invalid_shape when an insight is the falsy value %p',
    async (falsyInsight) => {
      const result = await run(
        evaluator,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { insights: [findApiDoc, falsyInsight] as any },
        { attackDiscoveries: [] }
      );
      expect(result.score).toBe(0);
      expect(result.label).toBe('invalid_shape');
    }
  );

  it('returns missing_insights when there are no insights', async () => {
    const result = await run(evaluator, { insights: null }, { attackDiscoveries: [] });
    expect(result.score).toBe(0);
    expect(result.label).toBe('missing_insights');
  });
});

describe('AttackDiscoveryRubric (empty reference)', () => {
  beforeEach(() => {
    executeUntilValidMock.mockReset();
  });

  it('returns a null score (not a structural zero) when the reference is empty', async () => {
    const result = await run(rubricEvaluator(), generateApiOutput, { attackDiscoveries: [] });

    expect(result.score).toBeNull();
    expect(result.label).toBe('no_reference');
  });

  // Build 01a12766: openai-gpt-oss-120b returned one structurally empty insight
  // shell and the rubric scored it 1/Y against the fabricated empty reference
  // ("PASS (vacuously - no content to compare)"). An empty reference means the
  // example carries no golden answer, so it must never pass an empty submission.
  it('never reports an all-empty submission as a pass when the reference is empty', async () => {
    executeUntilValidMock.mockResolvedValueOnce(
      gradeResponse('Y', 'PASS (vacuously - no content to compare)')
    );

    const result = await run(
      rubricEvaluator(),
      { insights: [emptyInsightShell] } as unknown as AttackDiscoveryTaskOutput,
      { attackDiscoveries: [] }
    );

    expect(result.score).toBeNull();
    expect(result.label).toBe('no_reference');
    expect(executeUntilValidMock).not.toHaveBeenCalled();
  });

  it('never reports an all-empty submission as a pass when the example carries no expected output', async () => {
    executeUntilValidMock.mockResolvedValueOnce(
      gradeResponse('Y', 'PASS (vacuously - no content to compare)')
    );

    const result = await run(
      rubricEvaluator(),
      { insights: [emptyInsightShell] } as unknown as AttackDiscoveryTaskOutput,
      undefined as unknown as AttackDiscoveryDatasetExample['output']
    );

    expect(result.score).toBeNull();
    expect(result.label).toBe('no_reference');
    expect(executeUntilValidMock).not.toHaveBeenCalled();
  });

  // Control: the empty-reference branch must not swallow cells that do have a
  // golden answer — those still reach the judge and keep their own verdict.
  it('still grades a submission against a non-empty reference', async () => {
    executeUntilValidMock.mockResolvedValueOnce(
      gradeResponse('N', 'the submission reports no discoveries')
    );

    const result = await run(
      rubricEvaluator(),
      { insights: [emptyInsightShell] } as unknown as AttackDiscoveryTaskOutput,
      {
        attackDiscoveries: [referencedDiscovery],
      } as unknown as AttackDiscoveryDatasetExample['output']
    );

    expect(executeUntilValidMock).toHaveBeenCalledTimes(1);
    expect(result.score).toBe(0);
    expect(result.label).toBe('N');
  });
});
