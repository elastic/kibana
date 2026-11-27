/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCostPerAlertEvaluator } from './cost_per_alert_evaluator';
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

const outputWith = (
  toolIds: string[],
  passedAlertCount: number | null
): AttackDiscoveryAgentBuilderTaskOutput => ({
  messages: [],
  steps: toolIds.map(toolCallStep) as AttackDiscoveryAgentBuilderTaskOutput['steps'],
  errors: [],
  workflow: {
    stages: [],
    retrievedAlertCount: null,
    retrievedAlertCountSource: 'none',
    passedAlertCount,
    validatedDiscoveryCount: null,
    retrievalEvidence: EMPTY_RETRIEVAL_EVIDENCE,
  },
});

const params = ({
  toolIds,
  passedAlertCount,
  attachments,
}: {
  toolIds: string[];
  passedAlertCount: number | null;
  attachments?: NonNullable<AttackDiscoveryAgentBuilderExample['input']>['attachments'];
}): Params => ({
  input: { attachments } as Params['input'],
  output: outputWith(toolIds, passedAlertCount),
  expected: {} as Params['expected'],
  metadata: {} as Params['metadata'],
});

describe('createCostPerAlertEvaluator', () => {
  const evaluator = createCostPerAlertEvaluator();

  // F3: the recorded opus multiple-alert-sets cell (trace
  // 9f32ddf1e74f6dc512a646d57f910914): 13 recorded calls for 2 passed alerts.
  // Pre-fix the numerator counted all 13, so 13 / 2 = 6.5 crossed the
  // 5-calls-per-alert gate and a run that completed the audited pipeline and
  // returned the expected validated discovery scored 0. The other ten calls are
  // bookkeeping: three load_skill, one fixture attachment read, four write_todos, two
  // attachments.add (the graph write-back the generator skill's report format
  // requires). The three calls left are the investigation.
  it('scores a compliant run on its investigative calls alone', async () => {
    const result = await evaluator.evaluate(
      params({
        toolIds: [
          'load_skill',
          'load_skill',
          'attachments.read',
          'write_todos',
          'security.attack-discovery.run',
          'write_todos',
          'platform.core.search',
          'search_relevant_skills',
          'load_skill',
          'attachments.add',
          'attachments.add',
          'write_todos',
          'write_todos',
        ],
        passedAlertCount: 2,
        attachments: ATTACHMENT_ALERTS,
      })
    );

    expect(result.score).toBe(1);
    expect(result.label).toBe('ok');
    expect(result.metadata).toMatchObject({
      toolCalls: 13,
      investigativeToolCalls: 3,
      excludedToolCalls: 10,
      passedAlertCount: 2,
      toolCallsPerAlert: 1.5,
    });
  });

  it('still fails an investigation that itself exceeds the gate', async () => {
    const result = await evaluator.evaluate(
      params({
        toolIds: [
          'load_skill',
          'write_todos',
          'attachments.add',
          ...Array.from({ length: 11 }, () => 'platform.core.execute_esql'),
        ],
        passedAlertCount: 2,
        attachments: ATTACHMENT_ALERTS,
      })
    );

    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ investigativeToolCalls: 11, toolCallsPerAlert: 5.5 });
  });

  it('does not count a compliant run without bookkeeping differently', async () => {
    const result = await evaluator.evaluate(
      params({ toolIds: ['load_skill', 'security.attack-discovery.run'], passedAlertCount: 2 })
    );

    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ investigativeToolCalls: 1, toolCallsPerAlert: 0.5 });
  });

  it('counts an attachment read as bookkeeping only when the example declares attachments', async () => {
    const toolIds = ['attachments.read', 'write_todos', 'security.attack-discovery.run'];

    const declared = await evaluator.evaluate(
      params({ toolIds, passedAlertCount: 2, attachments: ATTACHMENT_ALERTS })
    );
    expect(declared.metadata).toMatchObject({ investigativeToolCalls: 1, excludedToolCalls: 2 });

    const undeclared = await evaluator.evaluate(params({ toolIds, passedAlertCount: 2 }));
    expect(undeclared.metadata).toMatchObject({ investigativeToolCalls: 2, excludedToolCalls: 1 });
  });

  it('leaves the passed-alert denominator unchanged: no passed alerts is N/A', async () => {
    const noAlerts = await evaluator.evaluate(
      params({ toolIds: ['load_skill', 'security.attack-discovery.run'], passedAlertCount: 0 })
    );
    expect(noAlerts.score).toBeNull();
    expect(noAlerts.label).toBe('N/A');

    const unobservable = await evaluator.evaluate(
      params({ toolIds: ['load_skill', 'security.attack-discovery.run'], passedAlertCount: null })
    );
    expect(unobservable.score).toBeNull();
    expect(unobservable.label).toBe('N/A');
  });
});
