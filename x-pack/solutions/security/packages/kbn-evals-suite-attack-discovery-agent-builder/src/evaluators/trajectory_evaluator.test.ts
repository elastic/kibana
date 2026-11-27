/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStrictTrajectoryEvaluator } from './trajectory_evaluator';
import { EMPTY_RETRIEVAL_EVIDENCE } from '../types';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

interface Params {
  input: AttackDiscoveryAgentBuilderExample['input'];
  output: AttackDiscoveryAgentBuilderTaskOutput;
  expected: AttackDiscoveryAgentBuilderExample['output'];
  metadata: AttackDiscoveryAgentBuilderExample['metadata'];
}

const ATTACHMENT_ALERTS: NonNullable<AttackDiscoveryAgentBuilderExample['input']>['attachments'] = [
  { type: 'security.alerts', data: { alertIds: ['alert-1', 'alert-2'] } },
];

const toolCallStep = (toolId: string) => ({
  type: 'tool_call',
  tool_id: toolId,
  params: {},
  results: [],
});

const baseOutput = (toolIds: string[]): AttackDiscoveryAgentBuilderTaskOutput => ({
  messages: [],
  steps: toolIds.map(toolCallStep) as AttackDiscoveryAgentBuilderTaskOutput['steps'],
  errors: [],
  workflow: {
    stages: [],
    retrievedAlertCount: null,
    retrievedAlertCountSource: 'none',
    passedAlertCount: null,
    validatedDiscoveryCount: null,
    retrievalEvidence: EMPTY_RETRIEVAL_EVIDENCE,
  },
});

// The evaluator under test reads the tool sequence, so the extractor is the
// suite's own: the recorded step order, verbatim.
const evaluator = createStrictTrajectoryEvaluator({
  extractToolCalls: (output) =>
    (output.steps ?? [])
      .filter((step) => (step as { type?: string }).type === 'tool_call')
      .map((step) => step.tool_id as string)
      .filter(Boolean),
  goldenPathExtractor: (expected) =>
    (expected as { expectedToolPath?: string[] })?.expectedToolPath ?? [],
});

const params = ({
  input,
  toolIds,
  expectedToolPath,
}: {
  input: AttackDiscoveryAgentBuilderExample['input'];
  toolIds: string[];
  expectedToolPath: string[];
}): Params => ({
  input,
  output: baseOutput(toolIds),
  expected: { expectedToolPath } as Params['expected'],
  metadata: {} as Params['metadata'],
});

describe('createStrictTrajectoryEvaluator', () => {
  // F23b: the provided-alerts / multiple-alert-sets fixtures hand their alerts
  // as an attachment, so a compliant run pays the attachment read BEFORE the
  // expected tool. Pre-fix the read was counted against precision and capped
  // every compliant run at 0.5 — the routing requirement was satisfied and the
  // metric still could not reach its own ceiling.
  it('scores 1 when a compliant run reads the fixture attachment before the expected tool', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath: ['security.attack-discovery.run'],
          attachments: ATTACHMENT_ALERTS,
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: ['attachments.read', 'security.attack-discovery.run'],
        expectedToolPath: ['security.attack-discovery.run'],
      })
    );

    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({
      routingToolCalls: ['security.attack-discovery.run'],
      excludedToolCalls: ['attachments.read'],
    });
  });

  it('scores 1 when a compliant run also loads the skill', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath: ['security.attack-discovery.run'],
          attachments: ATTACHMENT_ALERTS,
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: ['load_skill', 'attachments.read', 'security.attack-discovery.run'],
        expectedToolPath: ['security.attack-discovery.run'],
      })
    );

    expect(result.score).toBe(1);
  });

  it('still counts extra routing calls against precision', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath: ['security.attack-discovery.run'],
          attachments: ATTACHMENT_ALERTS,
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: [
          'attachments.read',
          'platform.core.execute_esql',
          'security.attack-discovery.run',
        ],
        expectedToolPath: ['security.attack-discovery.run'],
      })
    );

    expect(result.score).toBe(0.5);
  });

  it('counts an attachment read when the example declares no attachments', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath: ['security.attack-discovery.run'],
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: ['attachments.read', 'security.attack-discovery.run'],
        expectedToolPath: ['security.attack-discovery.run'],
      })
    );

    expect(result.score).toBe(0.5);
  });

  // F2 (build 01a12766): the platform's own tool descriptions make bookkeeping
  // calls on every multi-step task — `write_todos` is told to be used
  // "frequently" for "any task that requires 3 or more distinct actions", and
  // the generator skill's report contract renders the attack flow graph through
  // `attachments.add`. Counting them against precision charged the platform's
  // contract to the model: 22 cells of this build scored below 1.0 with the
  // expected path satisfied in order.
  it('scores 1 when a compliant run also writes todos', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath: ['security.attack-discovery.run'],
          attachments: ATTACHMENT_ALERTS,
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: [
          'load_skill',
          'write_todos',
          'attachments.read',
          'security.attack-discovery.run',
          'write_todos',
        ],
        expectedToolPath: ['security.attack-discovery.run'],
      })
    );

    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({
      routingToolCalls: ['security.attack-discovery.run'],
      excludedToolCalls: ['load_skill', 'write_todos', 'attachments.read', 'write_todos'],
    });
  });

  it('scores 1 when a compliant run also persists the report attachments', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath: ['security.attack-discovery.run'],
          attachments: ATTACHMENT_ALERTS,
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: [
          'load_skill',
          'security.attack-discovery.run',
          'attachments.add',
          'attachments.add',
        ],
        expectedToolPath: ['security.attack-discovery.run'],
      })
    );

    expect(result.score).toBe(1);
  });

  it('keeps interleaved bookkeeping calls out of the denominator on a multi-tool path', async () => {
    const expectedToolPath = [
      'security.attack-discovery.get_default_esql_query',
      'platform.core.execute_esql',
      'security.attack-discovery.run',
    ];
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath,
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: [
          'load_skill',
          'load_skill',
          'security.attack-discovery.get_default_esql_query',
          'write_todos',
          'platform.core.execute_esql',
          'platform.core.execute_esql',
          'write_todos',
          'security.attack-discovery.run',
          'attachments.add',
        ],
        expectedToolPath,
      })
    );

    // The in-order assertion still reads the recorded sequence; of the calls
    // that are the model's own, one (`execute_esql` twice) is extra.
    expect(result.score).toBe(0.75);
  });

  it('still counts extra routing calls that sit next to bookkeeping calls', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath: ['security.attack-discovery.run'],
          attachments: ATTACHMENT_ALERTS,
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: [
          'load_skill',
          'write_todos',
          'attachments.read',
          'platform.core.execute_esql',
          'security.attack-discovery.run',
          'attachments.add',
        ],
        expectedToolPath: ['security.attack-discovery.run'],
      })
    );

    expect(result.score).toBe(0.5);
  });

  // Negative controls: the routing requirement itself is unchanged by the
  // precision fix — a run that never reaches the expected tool, or reaches the
  // expected tools out of order, still scores 0.
  it('scores 0 when the expected tool is never called', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath: ['security.attack-discovery.run'],
          attachments: ATTACHMENT_ALERTS,
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: ['load_skill', 'attachments.read'],
        expectedToolPath: ['security.attack-discovery.run'],
      })
    );

    expect(result.score).toBe(0);
  });

  it('scores 0 when the expected tool is never called, whatever bookkeeping the run did', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath: ['security.attack-discovery.run'],
          attachments: ATTACHMENT_ALERTS,
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: ['load_skill', 'write_todos', 'attachments.read', 'attachments.add'],
        expectedToolPath: ['security.attack-discovery.run'],
      })
    );

    expect(result.score).toBe(0);
  });

  it('scores 0 when the expected tools appear out of order', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {
          expectedToolPath: [
            'security.attack-discovery.get_default_esql_query',
            'platform.core.execute_esql',
          ],
        } as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: ['platform.core.execute_esql', 'security.attack-discovery.get_default_esql_query'],
        expectedToolPath: [
          'security.attack-discovery.get_default_esql_query',
          'platform.core.execute_esql',
        ],
      })
    );

    expect(result.score).toBe(0);
  });

  it('returns N/A when the example has no expected tool path', async () => {
    const result = await evaluator.evaluate(
      params({
        input: {} as AttackDiscoveryAgentBuilderExample['input'],
        toolIds: ['security.attack-discovery.run'],
        expectedToolPath: [],
      })
    );

    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });
});
