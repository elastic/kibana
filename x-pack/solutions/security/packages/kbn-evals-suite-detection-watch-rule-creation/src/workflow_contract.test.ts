/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import {
  DRAFT_STEP_ID,
  INVESTIGATION_INPUT,
  PROPOSE_STEP_ID,
  RULE_CREATION_INFERENCE_FEATURE_ID,
  RULE_CREATION_WORKFLOW_ID,
} from './constants';
import {
  REQUIRED_STEP_IDS,
  assertDraftRanOnModel,
  bindModelUnderTest,
  mergeFeatureOverride,
  parseStepNames,
} from './workflow_fixture';
import { extractDraftFromSteps } from './rule_creation_client';

/**
 * The suite drives the managed workflow by step id, input name and inference feature. The weekly
 * run is the only place these used to be checked, so a workflow change (the inline
 * `review_creation` gate replaced by `propose_creation`, `investigation_id` made required)
 * failed every model live instead of failing here. Pin them against the shipped definition.
 */
describe('managed rule-creation workflow contract', () => {
  const definition = getManagedWorkflowDefinition(RULE_CREATION_WORKFLOW_ID);
  const yaml = definition?.yaml ?? '';

  it('ships the workflow the suite runs', () => {
    expect(definition).toBeDefined();
  });

  it('declares every step the suite addresses by id', () => {
    const steps = parseStepNames(yaml);
    expect(steps).toEqual(expect.arrayContaining([...REQUIRED_STEP_IDS]));
    expect(REQUIRED_STEP_IDS).toEqual([DRAFT_STEP_ID, PROPOSE_STEP_ID]);
  });

  it('requires the investigation input the client supplies', () => {
    expect(yaml).toMatch(new RegExp(`required: \\[${INVESTIGATION_INPUT}\\]`));
  });

  it('resolves the draft connector from the feature the suite binds', () => {
    expect(yaml).toContain(`connector-id-by-feature: ${RULE_CREATION_INFERENCE_FEATURE_ID}`);
  });
});

describe('parseStepNames', () => {
  it('collects step names only under steps:', () => {
    const yaml = [
      'outputs:',
      '  - name: created',
      'steps:',
      '  - name: draft_creation',
      '    with:',
      '      - name: nested',
      '  - name: propose_creation',
    ].join('\n');
    expect(parseStepNames(yaml)).toEqual(['draft_creation', 'propose_creation']);
  });
});

describe('extractDraftFromSteps', () => {
  const rule = {
    name: 'Sudo brute force',
    description: 'd',
    query: 'FROM logs-* | LIMIT 1',
    language: 'esql',
    type: 'esql',
    severity: 'low',
    risk_score: 21,
    interval: '5m',
    from: 'now-6m',
    tags: [],
    threat: [],
  };
  const step = (output: unknown) =>
    [
      { stepId: DRAFT_STEP_ID, output: null },
      { stepId: DRAFT_STEP_ID, output },
    ] as unknown as WorkflowStepExecutionDto[];

  it('reads the drafted rule and the connector the step ran on', () => {
    const out = extractDraftFromSteps(
      step({
        structured_output: { rule, attachment_id: 'a', reason: '' },
        metadata: { usage: { connectorId: 'model-x' } },
      })
    );
    expect(out).toEqual({
      rule,
      skipped: false,
      skipReason: undefined,
      connectorId: 'model-x',
    });
  });

  it('reads an empty-query draft with a reason as a decline, not a rule', () => {
    const out = extractDraftFromSteps(
      step({
        structured_output: {
          rule: { ...rule, name: '', description: '', query: '' },
          attachment_id: '',
          reason: 'The data source does not exist.',
        },
      })
    );
    expect(out.rule).toBeUndefined();
    expect(out.skipped).toBe(true);
    expect(out.skipReason).toBe('The data source does not exist.');
  });

  it('reads an empty-query draft with no reason as a failed draft', () => {
    const out = extractDraftFromSteps(
      step({ structured_output: { rule: { ...rule, query: '' }, reason: '' } })
    );
    expect(out.rule).toBeUndefined();
    expect(out.skipped).toBe(false);
  });

  it('returns nothing when the step never produced output', () => {
    expect(extractDraftFromSteps([])).toEqual({
      rule: undefined,
      skipped: false,
      skipReason: undefined,
      connectorId: undefined,
    });
  });
});

describe('assertDraftRanOnModel', () => {
  it('passes when the step ran on the model under test', () => {
    expect(() => assertDraftRanOnModel({ connectorId: 'a', expected: 'a' })).not.toThrow();
  });

  it('fails when the step ran on another connector or reported none', () => {
    expect(() => assertDraftRanOnModel({ connectorId: 'b', expected: 'a' })).toThrow(
      /ran on connector "b"/
    );
    expect(() => assertDraftRanOnModel({ connectorId: undefined, expected: 'a' })).toThrow(
      /ran on connector "unknown"/
    );
  });
});

describe('bindModelUnderTest', () => {
  const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

  it('overrides only the reasoning feature and restores the previous settings', async () => {
    const previous = [
      { feature_id: 'agent_builder', endpoints: [{ id: 'keep' }] },
      { feature_id: RULE_CREATION_INFERENCE_FEATURE_ID, endpoints: [{ id: 'default' }] },
    ];
    const calls: Array<{ method: string; body?: string }> = [];
    const fetch = jest.fn(async (_path: string, opts: { method: string; body?: string }) => {
      calls.push({ method: opts.method, body: opts.body });
      return opts.method === 'GET' ? { data: { features: previous } } : {};
    }) as unknown as HttpHandler;

    const restore = await bindModelUnderTest({
      fetch,
      connector: { id: 'model-under-test' } as never,
      log,
    });
    expect(JSON.parse(calls[1].body!).features).toEqual([
      { feature_id: 'agent_builder', endpoints: [{ id: 'keep' }] },
      { feature_id: RULE_CREATION_INFERENCE_FEATURE_ID, endpoints: [{ id: 'model-under-test' }] },
    ]);

    await restore();
    expect(JSON.parse(calls[2].body!).features).toEqual(previous);
  });

  it('mergeFeatureOverride adds the feature when it was unset', () => {
    expect(mergeFeatureOverride([], 'f', 'e')).toEqual([
      { feature_id: 'f', endpoints: [{ id: 'e' }] },
    ]);
  });
});
