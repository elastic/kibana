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
 * The review context for the approval spec's fixture: a `query` change on a plain query rule
 * whose two backtest previews both succeeded, i.e. every non-gate precondition of
 * `apply_query_tuning` is met. Only the decision differs between the arms.
 */
const gateContext = ({
  approved,
  changeType = 'query',
  supported = true,
  queryApplied = false,
  rulePatched = false,
  response = true,
}: {
  approved: boolean;
  changeType?: string;
  supported?: boolean;
  /** Whether `apply_query_tuning` ran and returned the patched rule's id. */
  queryApplied?: boolean;
  rulePatched?: boolean;
  /** false reproduces a gate whose response was never recorded (missing path). */
  response?: boolean;
}): Record<string, unknown> => ({
  steps: {
    review_tuning: response ? { output: { response: { approved } } } : { output: {} },
    diagnose_rule: { output: { structured_output: { change_type: changeType } } },
    can_preview_query_change: { output: { supported } },
    record_preview_outcome: {
      output: {
        current_succeeded: true,
        current_is_aborted: false,
        proposed_succeeded: true,
        proposed_is_aborted: false,
      },
    },
    fetch_rule: { output: { updated_at: 'original' } },
    refetch_rule: { error: null, output: { updated_at: 'original' } },
    // A skipped step leaves no execution record: the key resolves to nothing, which is what
    // `undefined` reproduces here (see the plugin's own matrix in
    // alertzero/server/managed_workflows/detection_rule_workflows.test.ts).
    apply_query_tuning: queryApplied ? { error: null, output: { id: 'rule-id' } } : undefined,
    record_outcome: { output: { rule_patched: rulePatched } },
  },
});

describe('rule-tuning approval gate contract', () => {
  describe('the reject arm (approved: false)', () => {
    const context = gateContext({ approved: false });

    it('does not apply or even re-read the rule for a query change', () => {
      // The reject arm's engine assertion is "query byte-identical / updated_at unchanged".
      // Both hold only because these steps do not fire; an inverted gate flips them.
      expect(fires('apply_query_tuning', context)).toBe(false);
      expect(fires('refetch_rule', context)).toBe(false);
    });

    it('does not apply an exception or a risk score either', () => {
      // The approved flag gates all three apply steps. A rejection that still patched the
      // rule through one of the other branches would equally break the reject arm.
      expect(fires('apply_exception_tuning', context)).toBe(false);
      expect(fires('apply_risk_score_tuning', context)).toBe(false);

      expect(
        fires('apply_exception_tuning', gateContext({ approved: false, changeType: 'exception' }))
      ).toBe(false);
      expect(
        fires('apply_risk_score_tuning', gateContext({ approved: false, changeType: 'risk_score' }))
      ).toBe(false);
    });

    it('dismisses the harvested alerts and marks them reviewed', () => {
      expect(fires('mark_alerts_dismissed', context)).toBe(true);
    });

    it('never tags the alerts as applied or acknowledged', () => {
      // `applied` is what the approve arm asserts, and it is gated on record_outcome
      // .rule_patched — false whenever no apply step ran.
      expect(fires('mark_alerts_applied', context)).toBe(false);
      // A rejected query change on a supported rule is neither the manual hand-off nor the
      // unsupported-query path the acknowledged tag exists for.
      expect(fires('mark_alerts_acknowledged', context)).toBe(false);
      expect(fires('mark_alerts_acknowledged', gateContext({ approved: true }))).toBe(false);
      expect(
        fires('mark_alerts_acknowledged', gateContext({ approved: true, changeType: 'manual' }))
      ).toBe(true);
    });

    it('the tag steps read the same flags the arms assert on', () => {
      // The eval spec treats a landed `applied` tag as proof the rule was patched, so pin
      // the wiring rather than trusting the tag name.
      expect(conditionOf('mark_alerts_applied')).toContain(
        'steps.record_outcome.output.rule_patched == true'
      );
      expect(conditionOf('mark_alerts_dismissed')).toContain(
        'steps.review_tuning.output.response.approved == false'
      );
    });
  });

  describe('the approve arm (approved: true)', () => {
    const context = gateContext({ approved: true });

    it('applies the proposed query once both previews succeeded on an unedited rule', () => {
      expect(fires('apply_query_tuning', context)).toBe(true);
      expect(fires('refetch_rule', context)).toBe(true);
    });

    it('still refuses to apply when a preview failed or the rule was edited during the gate', () => {
      // The approve arm asserts the rule query equals the persisted proposed_query; that only
      // holds when every one of these is true, so each one is worth pinning.
      const withPreview = (overrides: Record<string, unknown>) => {
        const base = gateContext({ approved: true }) as {
          steps: { record_preview_outcome: { output: Record<string, unknown> } };
        };
        base.steps.record_preview_outcome.output = {
          ...base.steps.record_preview_outcome.output,
          ...overrides,
        };
        return base;
      };

      expect(fires('apply_query_tuning', withPreview({ current_succeeded: false }))).toBe(false);
      expect(fires('apply_query_tuning', withPreview({ proposed_is_aborted: true }))).toBe(false);
    });

    it('does not dismiss the alerts and does tag them applied', () => {
      expect(fires('mark_alerts_dismissed', context)).toBe(false);
      expect(fires('mark_alerts_applied', gateContext({ approved: true, rulePatched: true }))).toBe(
        true
      );
    });

    it('applies only when the preview path is supported for this rule', () => {
      expect(fires('apply_query_tuning', gateContext({ approved: true, supported: false }))).toBe(
        false
      );
    });
  });

  describe("the approve arm's precondition", () => {
    /**
     * `apply_query_tuning` never tests the rule shape itself — it tests
     * `can_preview_query_change.output.supported`, so that computed flag is what decides
     * whether an approval can patch anything. The approval spec's approve arm asserts a patch,
     * which is vacuous unless the seeded fixture really satisfies this.
     */
    const supported = (fetchRule: Record<string, unknown>) =>
      evaluates(
        withValueOf('can_preview_query_change', 'supported'),
        {
          steps: {
            diagnose_rule: { output: { structured_output: { change_type: 'query' } } },
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
      expect(supported({ ...plainQueryRule, type: 'threshold' })).toBe(false);
    });

    it('refuses the rule modes whose preview fields cannot be omitted', () => {
      // The preview API cannot conditionally omit these, so the apply path is closed for
      // them — an approve arm on such a rule would assert a patch that never happens.
      expect(supported({ ...plainQueryRule, data_view_id: 'logs-view' })).toBe(false);
      expect(supported({ ...plainQueryRule, timestamp_override: '@timestamp' })).toBe(false);
      expect(supported({ ...plainQueryRule, alert_suppression: { group_by: ['host.name'] } })).toBe(
        false
      );
    });

    it('refuses a non-query recommendation', () => {
      expect(
        evaluates(
          withValueOf('can_preview_query_change', 'supported'),
          {
            steps: {
              diagnose_rule: { output: { structured_output: { change_type: 'exception' } } },
              fetch_rule: { error: null, output: { enabled: true, ...plainQueryRule } },
            },
          },
          'can_preview_query_change.supported'
        )
      ).toBe(false);
    });
  });

  describe('the gate is fail-closed', () => {
    it('does not apply when the gate recorded no response', () => {
      // `strictVariables: false` renders the missing path as undefined and KQL term
      // evaluation is false for it, so an unrecorded decision cannot be read as approval.
      // This case is also what fails if the condition is ever rewritten as
      // `approved != false` (undefined != false is true — a fail-open gate).
      expect(fires('apply_query_tuning', gateContext({ approved: true, response: false }))).toBe(
        false
      );
      expect(
        fires('apply_exception_tuning', gateContext({ approved: true, response: false }))
      ).toBe(false);
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

    it('takes both arms and never skips one', () => {
      expect(spec()).toMatch(/approved: false/);
      expect(spec()).toMatch(/approved: true/);
      // A skipped or focused arm is how this spec silently stops proving the gate.
      expect(spec()).not.toMatch(/\.only\(/);
      expect(spec()).not.toMatch(/\.skip\(/);
      expect(spec()).not.toMatch(/test\.todo/);
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
