/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { changeTypeAccuracy, validProposal } from './evaluators';
import {
  explainMissingProposal,
  isAwaitingApproval,
  isWaitingStepNotReady,
  neverRan,
  type RuleTuningVerdict,
} from './workflow_task';
import type { ChangeType } from './constants';

describe('rule-tuning evaluators', () => {
  describe('changeTypeAccuracy', () => {
    it('scores 1 when the predicted change_type matches the golden label', async () => {
      const output: RuleTuningVerdict = {
        change_type: 'exception',
        executionId: 'exec-1',
        executionStatus: 'completed' as never,
      };
      const result = await changeTypeAccuracy.evaluate!({
        output,
        expected: { change_type: 'exception' },
      } as never);
      expect(result.score).toBe(1);
    });

    it('scores 0 when the predicted change_type differs from the golden label', async () => {
      const output: RuleTuningVerdict = {
        change_type: 'risk_score',
        executionId: 'exec-2',
        executionStatus: 'completed' as never,
      };
      const result = await changeTypeAccuracy.evaluate!({
        output,
        expected: { change_type: 'exception' },
      } as never);
      expect(result.score).toBe(0);
      expect(result.explanation).toContain('expected="exception"');
    });

    it('scores 0 when the workflow failed and no proposal exists', async () => {
      const output: RuleTuningVerdict = {
        executionId: 'exec-3',
        executionStatus: 'failed' as never,
      };
      const result = await changeTypeAccuracy.evaluate!({
        output,
        expected: { change_type: 'query' },
      } as never);
      expect(result.score).toBe(0);
      expect(result.label).toBe('none');
    });
  });

  describe('validProposal', () => {
    const base: RuleTuningVerdict = {
      change_type: 'exception',
      summary: 'FPs are all the build agent running java, not a detection',
      exception_entries: [{ field: 'host.name', operator: 'is', value: 'build-agent-01' }],
      executionId: 'exec-4',
      executionStatus: 'completed' as never,
    };

    it('accepts a well-formed exception proposal', async () => {
      const result = await validProposal.evaluate!({ output: base } as never);
      expect(result.score).toBe(1);
    });

    it('accepts an exception entry that carries a values array', async () => {
      const result = await validProposal.evaluate!({
        output: {
          ...base,
          exception_entries: [
            { field: 'process.name', operator: 'is_one_of', values: ['java', 'node'] },
          ],
        },
      } as never);
      expect(result.score).toBe(1);
    });

    it('accepts an existence-only exception entry with no payload', async () => {
      const result = await validProposal.evaluate!({
        output: {
          ...base,
          exception_entries: [{ field: 'process.parent.name', operator: 'exists' }],
        },
      } as never);
      expect(result.score).toBe(1);
    });

    it('rejects an exception proposal with no entries', async () => {
      const result = await validProposal.evaluate!({
        output: { ...base, exception_entries: [] },
      } as never);
      expect(result.score).toBe(0);
    });

    it('rejects an exception entry whose operator needs a value but carries none', async () => {
      const result = await validProposal.evaluate!({
        output: {
          ...base,
          exception_entries: [{ field: 'host.name', operator: 'is' }],
        },
      } as never);
      expect(result.score).toBe(0);
    });

    it('rejects an exception entry with an operator outside the workflow vocabulary', async () => {
      const result = await validProposal.evaluate!({
        output: {
          ...base,
          exception_entries: [{ field: 'host.name', operator: 'roughly_is', value: 'web-01' }],
        },
      } as never);
      expect(result.score).toBe(0);
      expect((result.metadata as { payloadValid: boolean }).payloadValid).toBe(false);
    });

    it('rejects a change_type outside the four-branch union', async () => {
      const result = await validProposal.evaluate!({
        output: { ...base, change_type: 'delete_rule' as ChangeType },
      } as never);
      expect(result.score).toBe(0);
      expect((result.metadata as { changeTypeValid: boolean }).changeTypeValid).toBe(false);
    });

    it('rejects the pre-#288807 labels the workflow can no longer emit', async () => {
      // #288807 replaced the flat `enum: [exception, suppression, query, threshold]`
      // with a oneOf of four consts. A proposal still using the old vocabulary is
      // schema drift, not a tuning decision — score it invalid, not merely wrong.
      for (const legacy of ['suppression', 'threshold'] as const) {
        const result = await validProposal.evaluate!({
          output: { ...base, change_type: legacy },
        } as never);
        expect(result.score).toBe(0);
        expect((result.metadata as { changeTypeValid: boolean }).changeTypeValid).toBe(false);
      }
    });

    it('accepts a query proposal on a query rule', async () => {
      const result = await validProposal.evaluate!({
        output: {
          ...base,
          change_type: 'query',
          proposed_query: 'process.name:java and host.os.type:linux',
        },
        metadata: { ruleType: 'query' },
      } as never);
      expect(result.score).toBe(1);
    });

    it('rejects a query proposal with an empty proposed_query', async () => {
      const result = await validProposal.evaluate!({
        output: { ...base, change_type: 'query', proposed_query: '' },
        metadata: { ruleType: 'query' },
      } as never);
      expect(result.score).toBe(0);
    });

    it('rejects a query proposal on a rule type whose query is never previewed or applied', async () => {
      // can_preview_query_change requires fetch_rule.output.type == 'query'; on any
      // other rule type the proposed query is unreachable, so it must not validate.
      const result = await validProposal.evaluate!({
        output: { ...base, change_type: 'query', proposed_query: 'process.name:java' },
        metadata: { ruleType: 'new_terms' },
      } as never);
      expect(result.score).toBe(0);
      expect((result.metadata as { payloadValid: boolean }).payloadValid).toBe(false);
    });

    it('rejects a query proposal when ruleType is absent from metadata', async () => {
      // `ruleType == null ||` would make the rule-type precondition vacuous: an
      // example whose metadata lost ruleType would score a query proposal valid for
      // free, which is exactly the drift this evaluator exists to catch.
      const result = await validProposal.evaluate!({
        output: { ...base, change_type: 'query', proposed_query: 'process.name:java' },
        metadata: {},
      } as never);
      expect(result.score).toBe(0);
    });

    it('accepts a well-formed risk_score proposal', async () => {
      const result = await validProposal.evaluate!({
        output: {
          ...base,
          change_type: 'risk_score',
          proposed_risk_score: 21,
          proposed_severity: 'low',
        },
      } as never);
      expect(result.score).toBe(1);
    });

    it('rejects a risk_score proposal missing the score or the severity', async () => {
      const missingSeverity = await validProposal.evaluate!({
        output: { ...base, change_type: 'risk_score', proposed_risk_score: 21 },
      } as never);
      expect(missingSeverity.score).toBe(0);

      const missingScore = await validProposal.evaluate!({
        output: { ...base, change_type: 'risk_score', proposed_severity: 'low' },
      } as never);
      expect(missingScore.score).toBe(0);
    });

    it('rejects a risk_score proposal whose score is outside 0-100', async () => {
      for (const outOfRangeScore of [-1, 101, 21.5]) {
        const result = await validProposal.evaluate!({
          output: {
            ...base,
            change_type: 'risk_score',
            proposed_risk_score: outOfRangeScore,
            proposed_severity: 'low',
          },
        } as never);
        expect(result.score).toBe(0);
      }
    });

    it('rejects a risk_score proposal with a severity outside the vocabulary', async () => {
      const result = await validProposal.evaluate!({
        output: {
          ...base,
          change_type: 'risk_score',
          proposed_risk_score: 40,
          proposed_severity: 'urgent',
        },
      } as never);
      expect(result.score).toBe(0);
    });

    it('accepts a manual proposal whose payload is the summary alone', async () => {
      const result = await validProposal.evaluate!({
        output: {
          ...base,
          change_type: 'manual',
          summary: 'No stable field separates the scanner from the targeted behaviour',
        },
      } as never);
      expect(result.score).toBe(1);
    });

    it('rejects any branch that has no renderable summary', async () => {
      // review_tuning's gate opens only when structured_output.summary != null, so a
      // summary-less proposal of ANY change_type can never reach a decision.
      const noSummary = await validProposal.evaluate!({
        output: { ...base, summary: undefined },
      } as never);
      expect(noSummary.score).toBe(0);
      expect((noSummary.metadata as { summaryValid: boolean }).summaryValid).toBe(false);

      const blankSummary = await validProposal.evaluate!({
        output: { ...base, change_type: 'manual', summary: '   ' },
      } as never);
      expect(blankSummary.score).toBe(0);
    });
  });

  describe('isAwaitingApproval', () => {
    // The review_tuning HITL gate reports `waiting_for_input`. A bare-string check for
    // 'waiting' alone silently never matched, so every run parked at the gate until the
    // next task's stale-cancel killed it and no fixture ever produced a score.
    it('recognises the waiting_for_input status the HITL gate actually emits', () => {
      expect(isAwaitingApproval(ExecutionStatus.WAITING_FOR_INPUT)).toBe(true);
    });

    it('also recognises the plain waiting status', () => {
      expect(isAwaitingApproval(ExecutionStatus.WAITING)).toBe(true);
    });

    it('does not auto-approve runs that are merely running or pending', () => {
      expect(isAwaitingApproval(ExecutionStatus.RUNNING)).toBe(false);
      expect(isAwaitingApproval(ExecutionStatus.PENDING)).toBe(false);
      expect(isAwaitingApproval(ExecutionStatus.WAITING_FOR_CHILD)).toBe(false);
    });

    it('does not auto-approve terminal runs', () => {
      expect(isAwaitingApproval(ExecutionStatus.COMPLETED)).toBe(false);
      expect(isAwaitingApproval(ExecutionStatus.CANCELLED)).toBe(false);
    });
  });

  describe('neverRan', () => {
    // `concurrency: max 1, drop` SKIPS a run scheduled into a non-drained backlog. Treating
    // that as a 0 reports an infrastructure collision as a model failure.
    it('flags runs the runtime dropped or cancelled', () => {
      expect(neverRan(ExecutionStatus.SKIPPED)).toBe(true);
      expect(neverRan(ExecutionStatus.CANCELLED)).toBe(true);
    });

    it('does not flag runs that genuinely executed', () => {
      expect(neverRan(ExecutionStatus.COMPLETED)).toBe(false);
      expect(neverRan(ExecutionStatus.FAILED)).toBe(false);
    });
  });
});

describe('explainMissingProposal', () => {
  // A timed-out agent step and a rule that failed the diagnose gate both score 0, but one is a
  // model result and the other a fixture bug. Asserting the gate cause unconditionally sent
  // readers to check rule seeding when GLM-5.2 had simply blown its 10m step budget.
  const gateSteps = [
    { stepId: 'fetch_rule', stepType: 'kibana.request' },
    { stepId: 'if_diagnose_rule', stepType: 'if' },
  ];
  const timeoutSteps = [
    ...gateSteps,
    { stepId: 'diagnose_rule', stepType: 'step_level_timeout' },
    { stepId: 'diagnose_rule', stepType: 'ai.agent' },
  ];

  it('blames the step timeout when the agent step ran out of time', () => {
    const msg = explainMissingProposal(timeoutSteps);
    expect(msg).toContain('hit its step timeout');
    expect(msg).not.toContain('failed the diagnose gate');
  });

  it('blames the diagnose gate when no step timed out', () => {
    const msg = explainMissingProposal(gateSteps);
    expect(msg).toContain('failed the diagnose gate');
    expect(msg).not.toContain('hit its step timeout');
  });

  it('always names the steps that ran so the cause is checkable', () => {
    expect(explainMissingProposal(timeoutSteps)).toContain('diagnose_rule(step_level_timeout)');
  });
});

describe('isWaitingStepNotReady', () => {
  // The resume route rejects with this 409 when the execution has reached waiting_for_input but
  // its waiting step row is not queryable yet. Retrying through it is correct; treating it as a
  // hard failure killed a 35-fixture run on fixture 8.
  const raceError = new Error(
    'Workflow execution "e1ebcee4" is in status "waiting step not found" but expected "waiting_for_input".'
  );

  it('matches the not-yet-persisted waiting step race', () => {
    expect(isWaitingStepNotReady(raceError)).toBe(true);
  });

  it('does NOT match a genuine double-approval conflict', () => {
    const alreadyResponded = new Error(
      'Workflow execution "e1ebcee4" is in status "already responded to or no longer waiting for input" but expected "waiting_for_input".'
    );
    expect(isWaitingStepNotReady(alreadyResponded)).toBe(false);
  });

  it('does NOT match an unrelated transport failure', () => {
    expect(isWaitingStepNotReady(new Error('socket hang up'))).toBe(false);
  });

  it('tolerates a non-Error rejection', () => {
    expect(isWaitingStepNotReady('waiting step not found')).toBe(true);
    expect(isWaitingStepNotReady(undefined)).toBe(false);
  });
});
