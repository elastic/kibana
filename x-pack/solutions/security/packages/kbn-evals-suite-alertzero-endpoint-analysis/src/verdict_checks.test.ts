/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  assertBenignVerdict,
  assertContainmentProposed,
  benignVerdictEvaluator,
  checkBenignVerdict,
  checkContainmentProposed,
  containmentProposedEvaluator,
} from './verdict_checks';

const ENDPOINT = 'agent-az-eval-01';
const context = { endpointIds: [ENDPOINT] };

const action = (actionWorkflowId: string, endpointIds: unknown) => ({
  actionWorkflowId,
  title: 'Contain',
  comment: 'Contain the host.',
  actionInput: { endpoint_ids: endpointIds },
  confidence: 'high',
});

const output = (overrides: Record<string, unknown> = {}) => ({
  verdict: 'confirmed_incident',
  propose: true,
  rationale: 'Encoded PowerShell follows a document process.',
  timeline: {
    window: { start: '2026-01-01T00:00:00Z', end: '2026-01-01T01:00:00Z' },
    events: [
      { timestamp: '2026-01-01T00:00:00Z', host: 'H', category: 'process', description: 'a' },
      { timestamp: '2026-01-01T00:01:00Z', host: 'H', category: 'process', description: 'b' },
    ],
  },
  iocs: {
    shas: [],
    ips: [],
    file_paths: [],
    malicious_commands: [{ value: 'encoded shell' }],
    affected_hosts: [{ value: 'H' }],
    ransom_note: [],
    encryption_marker: [],
    compromised_identities: [],
  },
  recommendedActions: [action(ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID, [ENDPOINT])],
  ...overrides,
});

describe('ContainmentProposed', () => {
  it.each([
    ['isolate host', ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID],
    ['kill process', ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID],
    ['suspend process', ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID],
  ])('passes a confirmed incident that proposes %s on the seeded endpoint', (_label, id) => {
    const result = checkContainmentProposed(
      output({ recommendedActions: [action(id, [ENDPOINT])] }),
      context
    );
    expect(result.failures).toEqual([]);
    expect(() => assertContainmentProposed(output(), context)).not.toThrow();
  });

  it('passes when one of several actions contains the seeded endpoint', () => {
    const { failures, actionTypes } = checkContainmentProposed(
      output({
        recommendedActions: [
          action(ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID, ['agent-other']),
          action(ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID, [ENDPOINT]),
        ],
      }),
      context
    );
    expect(failures).toEqual([]);
    expect(actionTypes).toEqual(['kill-process', 'isolate-host']);
  });

  it('fails propose:false even with confirmed_incident and a valid action', () => {
    const { failures } = checkContainmentProposed(output({ propose: false }), context);
    expect(failures).toEqual(['propose is not true']);
    expect(() => assertContainmentProposed(output({ propose: false }), context)).toThrow(
      /propose is not true/
    );
  });

  it('fails zero recommended actions and reports "none" action types', () => {
    const result = checkContainmentProposed(output({ recommendedActions: [] }), context);
    expect(result.failures).toEqual([expect.stringMatching(/no containment action/)]);
    expect(result.actionTypes).toEqual([]);
  });

  it('fails an action that targets a different host', () => {
    const { failures } = checkContainmentProposed(
      output({
        recommendedActions: [action(ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID, ['agent-other'])],
      }),
      context
    );
    expect(failures).toEqual([expect.stringMatching(/no containment action/)]);
  });

  it.each([
    ['not-an-array', 'agent-az-eval-01'],
    ['empty array', []],
    ['non-string element', [{ id: ENDPOINT }]],
  ])('fails an action whose endpoint_ids is %s', (_label, endpointIds) => {
    const { failures } = checkContainmentProposed(
      output({
        recommendedActions: [action(ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID, endpointIds)],
      }),
      context
    );
    expect(failures).toEqual([expect.stringMatching(/no containment action/)]);
  });

  it('fails a non-containment action for the seeded endpoint', () => {
    const { failures } = checkContainmentProposed(
      output({ recommendedActions: [action('system-alertzero-action-other', [ENDPOINT])] }),
      context
    );
    // The production schema may reject unknown action ids; either way the check must not pass.
    expect(failures.length).toBeGreaterThan(0);
  });

  it.each(['unclear', 'not_an_incident'])('fails verdict %s', (verdict) => {
    const { failures } = checkContainmentProposed(output({ verdict }), context);
    expect(failures).toEqual([expect.stringContaining(`verdict is "${verdict}"`)]);
  });

  it('collects every failure together', () => {
    const { failures } = checkContainmentProposed(
      output({ verdict: 'unclear', propose: false, recommendedActions: [] }),
      context
    );
    expect(failures).toHaveLength(3);
  });

  it('scores 1 / 0 through the evaluator', async () => {
    const pass = await containmentProposedEvaluator.evaluate({
      output: output(),
      expected: context,
    } as never);
    const fail = await containmentProposedEvaluator.evaluate({
      output: output({ recommendedActions: [] }),
      expected: context,
    } as never);
    expect(pass).toMatchObject({ score: 1, label: 'containment_proposed' });
    expect(fail).toMatchObject({ score: 0, label: 'containment_missing' });
  });
});

describe('BenignVerdict', () => {
  it.each(['not_an_incident', 'unclear'])('passes verdict %s', (verdict) => {
    const result = checkBenignVerdict(output({ verdict, propose: false, recommendedActions: [] }));
    expect(result).toEqual({ verdict, failures: [] });
    expect(() =>
      assertBenignVerdict(output({ verdict, propose: false, recommendedActions: [] }))
    ).not.toThrow();
  });

  it('fails confirmed_incident even when no action is proposed', () => {
    const benign = output({ propose: false, recommendedActions: [] });
    expect(checkBenignVerdict(benign).failures).toEqual([
      expect.stringContaining('"confirmed_incident"'),
    ]);
    expect(() => assertBenignVerdict(benign)).toThrow(/Benign host labelled as an incident/);
  });

  it('scores 1 / 0 through the evaluator', async () => {
    const pass = await benignVerdictEvaluator.evaluate({
      output: output({ verdict: 'not_an_incident', propose: false, recommendedActions: [] }),
      expected: {},
    } as never);
    const fail = await benignVerdictEvaluator.evaluate({
      output: output({ propose: false, recommendedActions: [] }),
      expected: {},
    } as never);
    expect(pass).toMatchObject({ score: 1, label: 'not_an_incident' });
    expect(fail).toMatchObject({ score: 0, label: 'confirmed_incident' });
  });
});
