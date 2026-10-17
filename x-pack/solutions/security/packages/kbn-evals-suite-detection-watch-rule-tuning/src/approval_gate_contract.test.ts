/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Contract tests for the approval gate the `rule_tuning_approval.spec.ts` arms assert on.
 *
 * The eval spec can only show what the gate does on a live stack; these tests pin WHAT IT
 * MUST DO, using the engine the workflow itself runs on (`createWorkflowLiquidEngine` from
 * `@kbn/workflows`, whose `evalValueSync` is what the execution engine feeds to
 * `evaluateCondition`). They are the mutation target for the gate: invert
 * `apply_query_tuning.if` in `rule_tuning_review.yaml` and the reject-arm case below fails,
 * because a rejected decision would then be applied. A gate test that stays green with the
 * gate removed proves nothing, so this file is deliberately sensitive to that edit.
 *
 * `resolve`/`missing path` semantics matter here: the engine renders an unresolved path as
 * undefined (`strictVariables: false`), and KQL term evaluation is false for a missing path,
 * so `approved == true` on a missing response is false — the gate is fail-closed by
 * construction. The `no response recorded` case below pins exactly that, and it is also why
 * rewriting the gate as `approved != false` (fail-open: undefined != false is true) must not
 * be mistaken for a style change.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createWorkflowLiquidEngine } from '@kbn/workflows';
import { ACKNOWLEDGED_TAG, APPLIED_TAG, DISMISSED_TAG, REVIEWED_TAG } from './constants';

const read = (relativePath: string) => readFileSync(join(__dirname, '..', relativePath), 'utf8');

const REVIEW_YAML =
  '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/rule_tuning_review.yaml';

const readReview = () => readFileSync(join(__dirname, REVIEW_YAML), 'utf8');

/** Every `  - name: <id>` step, mapped to its raw block (up to the next step). */
const stepBlocks = (): Map<string, string> => {
  const yaml = readReview();
  const names = [...yaml.matchAll(/^ {2}- name: (.+)$/gm)];
  if (names.length === 0) {
    throw new Error('rule_tuning_review.yaml no longer declares `  - name:` step entries');
  }
  const blocks = new Map<string, string>();
  names.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < names.length ? names[index + 1].index ?? yaml.length : yaml.length;
    blocks.set(match[1].trim(), yaml.slice(start, end));
  });
  return blocks;
};

/**
 * A step's `if:` / `with.<key>` condition as a single expression string: folded (`>-`)
 * continuation lines are joined, the surrounding quotes of an inline form are dropped, and
 * the `${{ }}` wrapper is removed — exactly the text the engine evaluates.
 *
 * `renderValueWithContext` is what the execution engine feeds the step condition through, and
 * it evaluates the inner expression to a typed value (a boolean for these comparisons), so
 * evaluating the extracted expression is the same computation the workflow performs.
 */
const expressionAt = (block: string, header: RegExpExecArray, stepName: string): string => {
  const [, indent, value] = header;
  // `>-` / `|` are YAML block-scalar indicators, not content: the condition starts on the
  // continuation lines below.
  const inline = /^[|>][-+]?$/.test(value.trim()) ? [] : [value.trim()];
  const lines = [...inline];
  // Blank lines inside a folded scalar do not end it, so drop them before scanning for the
  // first line that is dedented back to (or above) the `if:` key.
  const continuation = block
    .slice((header.index ?? 0) + header[0].length)
    .split('\n')
    .slice(1)
    .filter((line) => line.trim() !== '');

  for (const line of continuation) {
    if (line.length - line.trimStart().length <= indent.length) break;
    lines.push(line.trim());
  }

  const rendered = lines
    .join(' ')
    .replace(/^["']|["']$/g, '')
    .trim();
  const expression = rendered
    .replace(/^\$\{\{/, '')
    .replace(/\}\}$/, '')
    .trim();
  if (!expression) {
    throw new Error(`could not read an expression out of "${stepName}" (${rendered})`);
  }
  return expression;
};

const blockOf = (stepName: string): string => {
  const block = stepBlocks().get(stepName);
  if (!block) {
    throw new Error(
      `step "${stepName}" is gone from rule_tuning_review.yaml — the approval spec's arms ` +
        `address it by name, so its removal invalidates them.`
    );
  }
  return block;
};

const conditionOf = (stepName: string): string => {
  const block = blockOf(stepName);
  const header = /^( +)if: (.*)$/m.exec(block);
  if (!header) {
    throw new Error(`step "${stepName}" no longer declares a step-level if:`);
  }
  return expressionAt(block, header, stepName);
};

/**
 * A `data.set` step's `with.<key>` value — where the steps that compute a flag rather than
 * branch (`can_preview_query_change.supported`) keep their condition.
 */
const withValueOf = (stepName: string, key: string): string => {
  const block = blockOf(stepName);
  const header = new RegExp(`^( +)${key}: (.*)$`, 'm').exec(block);
  if (!header) {
    throw new Error(`step "${stepName}" no longer declares with.${key}`);
  }
  return expressionAt(block, header, `${stepName}.${key}`);
};

/** Evaluate one expression against a workflow context, as the engine would. */
const evaluates = (
  expression: string,
  context: Record<string, unknown>,
  label: string
): boolean => {
  const value = createWorkflowLiquidEngine().evalValueSync(expression, context);
  if (typeof value !== 'boolean') {
    throw new Error(
      `"${label}" evaluated to ${typeof value} (${String(
        value
      )}) — expected a boolean. The condition syntax changed; these tests can no longer ` +
        `tell whether the step fires.`
    );
  }
  return value;
};

/** Evaluate one step's `if:` condition against a workflow context. */
const fires = (stepName: string, context: Record<string, unknown>): boolean =>
  evaluates(conditionOf(stepName), context, stepName);

/**
 * The review context for the approval spec's fixture: a `query` change whose
 * proposal workflow recorded the given outcome. Post-#294745 the decision lives
 * in the propose_* step outputs (status/decision) and the tag steps read the
 * aggregated flags from `record_proposal_action_decision`, so that is the shape
 * the contexts below carry.
 */
const gateContext = ({
  approved,
  applied,
  changeType = 'query',
  manualDecision,
  response = true,
}: {
  /** propose_* output.decision. */
  approved?: boolean;
  /** propose_* output.status (only `succeeded` counts as applied). */
  applied?: 'succeeded' | 'failed';
  changeType?: string;
  /** propose_manual.output.decision for the acknowledged-tag path. */
  manualDecision?: string;
  /** false reproduces a gate whose response was never recorded (missing path). */
  response?: boolean;
}): Record<string, unknown> => {
  const proposeStep = (status?: string, decision?: string) =>
    response
      ? {
          error: null,
          output: {
            ...(status != null ? { status } : {}),
            ...(decision != null ? { decision } : {}),
          },
        }
      : undefined;

  const proposeOutputs: Record<string, unknown> = {
    propose_query:
      changeType === 'query'
        ? proposeStep(applied, approved ? 'approved' : 'dismissed')
        : undefined,
    propose_exception:
      changeType === 'exception'
        ? proposeStep(applied, approved ? 'approved' : 'dismissed')
        : undefined,
    propose_risk_score:
      changeType === 'risk_score'
        ? proposeStep(applied, approved ? 'approved' : 'dismissed')
        : undefined,
    propose_threshold:
      changeType === 'threshold'
        ? proposeStep(applied, approved ? 'approved' : 'dismissed')
        : undefined,
    propose_schedule:
      changeType === 'schedule'
        ? proposeStep(applied, approved ? 'approved' : 'dismissed')
        : undefined,
    propose_manual: changeType === 'manual' ? proposeStep('succeeded', manualDecision) : undefined,
  };

  return {
    steps: {
      ...proposeOutputs,
      // The tag steps read the aggregated flags, not the propose outputs
      // directly — reproduce what record_proposal_action_decision computes.
      record_proposal_action_decision: {
        output: {
          applied: changeType !== 'manual' && applied === 'succeeded' && response,
          approved:
            response && approved === true && changeType !== 'manual'
              ? true
              : response && manualDecision === 'approved',
          dismissed: response && approved === false && changeType !== 'manual',
        },
      },
      create_investigation: { output: { conversation_id: 'conv-1' } },
      diagnose_rule: { output: { structured_output: { change_type: changeType } } },
    },
  };
};

/**
 * The aggregated flags `record_proposal_action_decision` computes, evaluated with
 * the engine exactly as the workflow does.
 */
const aggregate = (
  key: 'applied' | 'approved' | 'dismissed',
  context: Record<string, unknown>
): boolean =>
  evaluates(
    withValueOf('record_proposal_action_decision', key),
    context,
    `record_proposal_action_decision.${key}`
  );

describe('rule-tuning approval gate contract', () => {
  describe('the reject arm (dismissed)', () => {
    const context = gateContext({ approved: false });

    it('aggregates the dismissal and marks the alerts dismissed', () => {
      // The reject arm's engine assertion is "query byte-identical". That only
      // holds when the aggregated decision flags route it to the dismiss branch.
      expect(aggregate('dismissed', context)).toBe(true);
      expect(aggregate('applied', context)).toBe(false);
      expect(fires('mark_alerts_dismissed', context)).toBe(true);
      expect(fires('refetch_rule', context)).toBe(false);
    });

    it('never tags the alerts as applied or acknowledged', () => {
      expect(fires('mark_alerts_applied', context)).toBe(false);
      // A dismissed query proposal is neither the manual hand-off nor the
      // unsupported-query path the acknowledged tag exists for.
      expect(fires('mark_alerts_acknowledged', context)).toBe(false);
    });

    it('the tag steps read the same flags the arms assert on', () => {
      // The eval spec treats a landed `applied` tag as proof the rule was patched,
      // so pin the wiring rather than trusting the tag name.
      expect(conditionOf('mark_alerts_applied')).toContain(
        'steps.record_proposal_action_decision.output.applied == true'
      );
      expect(conditionOf('mark_alerts_dismissed')).toContain(
        'steps.record_proposal_action_decision.output.dismissed == true'
      );
      expect(conditionOf('mark_alerts_acknowledged')).toContain(
        "steps.propose_manual.output.decision == 'approved'"
      );
    });
  });

  describe('the approve arm (approved)', () => {
    const context = gateContext({ approved: true, applied: 'succeeded' });

    it('aggregates the approval as applied once the action workflow succeeded', () => {
      expect(aggregate('approved', context)).toBe(true);
      expect(aggregate('applied', context)).toBe(true);
      expect(aggregate('dismissed', context)).toBe(false);
      expect(fires('mark_alerts_applied', context)).toBe(true);
      expect(fires('mark_alerts_dismissed', context)).toBe(false);
      // The rule is re-read only after a patch, to refresh the attachment.
      expect(fires('refetch_rule', context)).toBe(true);
    });

    it('an approved-but-failed action is neither applied nor dismissed', () => {
      // `applied` keys on status == 'succeeded': an approval whose edit-rule
      // action errored (e.g. the rule was edited mid-gate and the revision
      // conflict fired) must not land the applied tag.
      const failed = gateContext({ approved: true, applied: 'failed' });
      expect(aggregate('applied', failed)).toBe(false);
      expect(aggregate('approved', failed)).toBe(true);
      expect(fires('mark_alerts_applied', failed)).toBe(false);
      expect(fires('refetch_rule', failed)).toBe(false);
    });

    it('a manual approval acknowledges instead of applying', () => {
      const manual = gateContext({ changeType: 'manual', manualDecision: 'approved' });
      expect(fires('mark_alerts_acknowledged', manual)).toBe(true);
      expect(fires('mark_alerts_applied', manual)).toBe(false);
      expect(fires('mark_alerts_dismissed', manual)).toBe(false);
    });
  });

  describe('the preview path the approve arm depends on', () => {
    /**
     * `propose_tuning` only raises a proposal for change types whose patch the
     * preview API can simulate (`can_preview_query_change.supported`), so that
     * computed flag decides whether an approval can patch anything. The approval
     * spec's approve arm asserts a patch, which is vacuous unless the seeded
     * fixture really satisfies this.
     */
    const supported = (fetchRule: Record<string, unknown>, changeType = 'query') =>
      evaluates(
        withValueOf('can_preview_query_change', 'supported'),
        {
          steps: {
            diagnose_rule: { output: { structured_output: { change_type: changeType } } },
            fetch_rule: { error: null, output: { enabled: true, ...fetchRule } },
          },
        },
        'can_preview_query_change.supported'
      );

    const plainQueryRule = {
      type: 'query',
      data_view_id: null,
      timestamp_override: null,
      alert_suppression: null,
    };

    it("supports the spec's fixture: a query change on a plain query rule", () => {
      expect(supported(plainQueryRule)).toBe(true);
    });

    it('refuses a rule type whose query is never previewed or applied', () => {
      expect(supported({ ...plainQueryRule, type: 'new_terms' })).toBe(false);
    });

    it('supports threshold and schedule changes on both query and threshold rules', () => {
      // #291874/#294332: the second clause only narrows THRESHOLD rules to the
      // threshold/schedule arms; a query rule passes for every previewable type.
      expect(supported({ ...plainQueryRule, type: 'threshold' }, 'threshold')).toBe(true);
      expect(supported({ ...plainQueryRule, type: 'threshold' }, 'schedule')).toBe(true);
      expect(supported(plainQueryRule, 'threshold')).toBe(true);
      expect(supported(plainQueryRule, 'schedule')).toBe(true);
      // A threshold rule cannot take a query/exception proposal.
      expect(supported({ ...plainQueryRule, type: 'threshold' }, 'query')).toBe(false);
    });

    it('refuses the rule modes whose preview fields cannot be omitted', () => {
      expect(supported({ ...plainQueryRule, data_view_id: 'logs-view' })).toBe(false);
      expect(supported({ ...plainQueryRule, timestamp_override: '@timestamp' })).toBe(false);
      expect(supported({ ...plainQueryRule, alert_suppression: { group_by: ['host.name'] } })).toBe(
        false
      );
    });

    it('refuses a non-previewable recommendation', () => {
      expect(supported(plainQueryRule, 'risk_score')).toBe(false);
    });
  });

  describe('the gate is fail-closed', () => {
    it('does not apply when the proposal never recorded an outcome', () => {
      // `strictVariables: false` renders the missing step as undefined and KQL
      // equality is false for it, so an unrecorded decision cannot be read as
      // approval. This case is also what fails if the condition is ever rewritten
      // as `approved != false` (undefined != false is true — a fail-open gate).
      const unanswered = gateContext({ approved: true, response: false });
      expect(aggregate('applied', unanswered)).toBe(false);
      expect(aggregate('approved', unanswered)).toBe(false);
      expect(aggregate('dismissed', unanswered)).toBe(false);
      expect(fires('mark_alerts_applied', unanswered)).toBe(false);
    });
  });

  describe('the tags the approval spec asserts on', () => {
    it('mirror the review workflow consts', () => {
      const declared = new Map(
        [...readReview().matchAll(/^ {2}([a-z_]+_tag): (.+)$/gm)].map((match) => [
          match[1],
          match[2].trim(),
        ])
      );

      expect(declared.get('reviewed_tag')).toBe(REVIEWED_TAG);
      expect(declared.get('dismissed_tag')).toBe(DISMISSED_TAG);
      expect(declared.get('applied_tag')).toBe(APPLIED_TAG);
      expect(declared.get('acknowledged_tag')).toBe(ACKNOWLEDGED_TAG);
    });
  });

  describe('the approval spec itself', () => {
    const spec = () => read('evals/rule_tuning_approval.spec.ts');

    it('takes both arms and never skips one silently', () => {
      expect(spec()).toMatch(/approved: false/);
      expect(spec()).toMatch(/approved: true/);
      // A focused arm is how this spec silently stops proving the gate.
      expect(spec()).not.toMatch(/\.only\(/);
      expect(spec()).not.toMatch(/test\.todo/);
      // Skipping remains forbidden in every silent form: no bare `.skip()`, no
      // `.skip(true)` without a reason. The one allowed form is the explicit
      // `.skip(true, reason)` inside the `unmeasured` helper, which every arm must
      // route through — it logs the reason at warning level and the reason names the
      // fixture, so an UNMEASURED arm can never pass for a proved gate.
      const skips =
        spec()
          .replace(/^\s*\/\/.*$/gm, '')
          .match(/\.skip\(([^)]*)\)/g) ?? [];
      expect(skips).toEqual(['.skip(true, reason)']);
      expect(spec()).toMatch(/const unmeasured = \(log: ToolingLog, reason: string\): never => \{/);
    });

    it('cleans up after every arm, not only on success', () => {
      // A seeded rule left behind is re-harvested by the next sweep, which then opens a
      // second review child and fails the harness's one-child assert — the failure would
      // land on an unrelated run instead of this one.
      expect(spec()).toMatch(/evaluate\.afterEach\(/);
      expect(spec()).toMatch(/cleanupSeededArtifacts\(/);
    });
  });
});
