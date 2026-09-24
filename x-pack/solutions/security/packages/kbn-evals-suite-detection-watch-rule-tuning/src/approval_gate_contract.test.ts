/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Contract tests for the proposal gates the `rule_tuning_approval.spec.ts` arms assert on.
 *
 * The eval spec can only show what the gates do on a live stack; these tests pin WHAT THEY
 * MUST DO, using the engine the workflow itself runs on (`createWorkflowLiquidEngine` from
 * `@kbn/workflows`, whose `evalValueSync` is what the execution engine feeds to
 * `evaluateCondition`). They are the mutation target for the gates: rewrite
 * `record_proposal_action_decision`'s `applied` flag so it reads a decision off `status`
 * and the reject-arm case below fails, because a dismissed decision would then be applied.
 * A gate test that stays green with the gate removed proves nothing, so this file is
 * deliberately sensitive to those edits.
 *
 * The upstream architecture this file pins (post-#290665):
 *   - the single `waitForApproval` step is gone; a `propose_tuning` switch opens one
 *     investigation proposal per change type (`propose_query` / `propose_risk_score` /
 *     `propose_exception` through `system-create-proposal` with an action,
 *     `propose_manual` — the default arm — with none), each with `autoApprove: false`;
 *   - `record_proposal_action_decision` derives two INDEPENDENT axes: `applied` from the
 *     action arms' `status == 'succeeded'`, and `approved` / `dismissed` from the gate's
 *     `decision` — a dismissal and an approved action-less proposal both report
 *     `no_action`, so reading a decision off `status` cannot work;
 *   - the manual-autonomy entry gate (`propose_entry` → `record_entry` →
 *     `mark_alerts_declined` / `stop_declined`) runs before diagnosis.
 *
 * `resolve`/`missing path` semantics matter here: the engine renders an unresolved path as
 * undefined (`strictVariables: false`), and an `==` comparison is false for a missing path,
 * so `decision == 'approved'` on a missing response is false — every gate is fail-closed by
 * construction. The `no decision recorded` case below pins exactly that, and it is also why
 * rewriting `approved` as `decision != 'dismissed'` (fail-open: undefined != 'dismissed' is
 * true) must not be mistaken for a style change.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createWorkflowLiquidEngine } from '@kbn/workflows';
import { ACKNOWLEDGED_TAG, APPLIED_TAG, DISMISSED_TAG, REVIEWED_TAG } from './constants';

const REVIEW_YAML =
  '../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/rule_tuning_review.yaml';

const readReview = () => readFileSync(join(__dirname, REVIEW_YAML), 'utf8');

/** Every `  - name: <id>` step, mapped to its raw block (up to the next step). */
const stepBlocks = (): Map<string, string> => {
  const yaml = readReview();
  const names = [...yaml.matchAll(/^( *)- name: (.+)$/gm)];
  if (names.length === 0) {
    throw new Error('rule_tuning_review.yaml no longer declares `- name:` step entries');
  }
  const blocks = new Map<string, string>();
  names.forEach((match, index) => {
    const indent = match[1].length;
    const start = match.index ?? 0;
    // A block ends at the next sibling-or-outer step, so the switch arms' nested steps
    // (`propose_query`, `propose_manual`, …) stay inside their parent for a whole-arm
    // read while still being addressable by name.
    let end = yaml.length;
    for (let next = index + 1; next < names.length; next++) {
      if (names[next][1].length <= indent) {
        end = names[next].index ?? end;
        break;
      }
    }
    blocks.set(match[2].trim(), yaml.slice(start, end));
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
 * branch (`can_preview_query_change.supported`, `record_proposal_action_decision.applied`)
 * keep their condition.
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

/** The proposal steps the tuning switch opens, keyed by the change type that selects them. */
const PROPOSAL_STEPS = [
  'propose_query',
  'propose_risk_score',
  'propose_exception',
  'propose_manual',
] as const;

type ProposalStep = (typeof PROPOSAL_STEPS)[number];

const proposalStepFor = (changeType: string): ProposalStep => {
  switch (changeType) {
    case 'query':
      return 'propose_query';
    case 'risk_score':
      return 'propose_risk_score';
    case 'exception':
      return 'propose_exception';
    default:
      return 'propose_manual';
  }
};

interface GateOptions {
  changeType?: string;
  supported?: boolean;
  /** What the gate recorded: 'approved' / 'dismissed', or undefined for no decision. */
  decision?: string;
  /** How far the gate got: 'succeeded' / 'no_action' / 'expired' / 'failed'. */
  status?: string;
}

/**
 * The review context for the approval spec's fixture: a `query` change on a plain query rule
 * whose two backtest previews both succeeded, i.e. every non-gate precondition is met. Only
 * the decision recorded on the proposal differs between the arms. Per the switch semantics,
 * only the arm the change type selects has an output; the others resolve to nothing.
 */
const gateContext = ({
  changeType = 'query',
  supported = true,
  decision,
  status,
}: GateOptions = {}): Record<string, unknown> => {
  const steps: Record<string, unknown> = {
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
    create_investigation: { output: { conversation_id: 'conv-1' } },
    // A skipped step leaves no execution record: the key resolves to nothing, which is what
    // `undefined` reproduces here (see the plugin's own matrix in
    // alertzero/server/managed_workflows/detection_rule_workflows.test.ts).
    propose_manual: undefined,
    propose_query: undefined,
    propose_risk_score: undefined,
    propose_exception: undefined,
  };

  const ran = proposalStepFor(changeType);
  const recorded = decision !== undefined || status !== undefined;
  steps[ran] = recorded ? { output: { decision, status } } : { output: {} };

  // The tag steps read the flags `record_proposal_action_decision` computed from the
  // arms' outputs, so evaluate the same `with` expressions the workflow does.
  const flag = (key: 'applied' | 'approved' | 'dismissed') =>
    evaluates(withValueOf('record_proposal_action_decision', key), { steps }, key);
  steps.record_proposal_action_decision = {
    output: { applied: flag('applied'), approved: flag('approved'), dismissed: flag('dismissed') },
  };

  return { steps };
};

/**
 * `record_proposal_action_decision`'s three flags evaluated against a set of per-arm gate
 * outcomes. This is the wiring the tag steps and `refetch_rule` read, so pinning it here
 * pins the arms' observable effects without running the workflow.
 */
const decisionFlags = (
  outcomes: Partial<Record<ProposalStep, { decision?: string; status?: string }>>
) => {
  const steps: Record<string, unknown> = {};
  for (const name of PROPOSAL_STEPS) {
    steps[name] = outcomes[name] ? { output: outcomes[name] } : undefined;
  }
  const evaluate = (key: 'applied' | 'approved' | 'dismissed') =>
    evaluates(
      withValueOf('record_proposal_action_decision', key),
      { steps },
      `record_proposal_action_decision.${key}`
    );
  return {
    applied: evaluate('applied'),
    approved: evaluate('approved'),
    dismissed: evaluate('dismissed'),
  };
};

describe('rule-tuning approval gate contract', () => {
  describe('the switch opens exactly one gated proposal per change type', () => {
    it('routes query, risk_score and exception arms to the proposal step with an action', () => {
      expect(readReview()).toMatch(
        /expression: "\{\{ steps.diagnose_rule.output.structured_output.change_type \}\}"/
      );
      expect(blockOf('propose_query')).toContain('workflow-id: system-create-proposal');
      expect(blockOf('propose_query')).toContain(
        'actionWorkflowId: system-alertzero-action-edit-rule'
      );
      expect(blockOf('propose_risk_score')).toContain(
        'actionWorkflowId: system-alertzero-action-edit-rule'
      );
      // Not a rule edit: an exception item has its own action.
      expect(blockOf('propose_exception')).toContain(
        'actionWorkflowId: system-alertzero-action-add-rule-exception'
      );
    });

    it('never auto-approves a tuning proposal', () => {
      // The eval spec's arms answer the gate themselves; an auto-approving proposal
      // would apply the change before the analyst ever sees it.
      for (const step of ['propose_query', 'propose_risk_score', 'propose_exception'] as const) {
        expect(blockOf(step)).toMatch(/autoApprove: false/);
      }
    });

    it('carries no action on the manual hand-off arm', () => {
      // The analyst makes the change themselves, so approval is the whole lifecycle:
      // an action here would let `applied` go true without any rule change landing.
      expect(blockOf('propose_manual')).not.toMatch(/actionWorkflowId/);
    });

    it('names a default arm, so an unrecognised change type still reaches the analyst', () => {
      const switchBlock = blockOf('propose_tuning');
      expect(switchBlock).toMatch(/default:/);
      expect(switchBlock).toMatch(/- name: propose_manual/);
    });
  });

  describe('the decision flags are computed on two independent axes', () => {
    it("derives `applied` only from an action arm whose gate settled as 'succeeded'", () => {
      expect(
        decisionFlags({ propose_query: { decision: 'approved', status: 'succeeded' } }).applied
      ).toBe(true);
      expect(decisionFlags({ propose_risk_score: { status: 'succeeded' } }).applied).toBe(true);
      expect(decisionFlags({ propose_exception: { status: 'succeeded' } }).applied).toBe(true);
    });

    it('does not count an approved proposal whose action never ran as applied', () => {
      // The approve arm asserts the rule was really patched; `status == 'no_action'`
      // is what an approved action-less (manual) proposal reports.
      expect(
        decisionFlags({ propose_query: { decision: 'approved', status: 'no_action' } }).applied
      ).toBe(false);
      expect(
        decisionFlags({ propose_query: { decision: 'approved', status: 'expired' } }).applied
      ).toBe(false);
    });

    it("reads a decision off `decision`, never off `status` — both axes report 'no_action'", () => {
      // A dismissal and an approved action-less proposal are indistinguishable on
      // `status`; deriving `dismissed` from status would mark the approved manual
      // hand-off dismissed.
      const dismissed = decisionFlags({
        propose_query: { decision: 'dismissed', status: 'no_action' },
      });
      expect(dismissed.dismissed).toBe(true);
      expect(dismissed.approved).toBe(false);

      const approvedManual = decisionFlags({
        propose_manual: { decision: 'approved', status: 'no_action' },
      });
      expect(approvedManual.approved).toBe(true);
      expect(approvedManual.dismissed).toBe(false);
      expect(approvedManual.applied).toBe(false);
    });

    it('stays false on every axis when nobody decided', () => {
      // `strictVariables: false` renders the missing paths as undefined and the `==`
      // comparisons are false for it, so an unanswered gate is neither approved nor
      // dismissed. This is also what fails if `approved` is rewritten as
      // `decision != 'dismissed'` (undefined != 'dismissed' is true — a fail-open gate).
      expect(decisionFlags({})).toEqual({ applied: false, approved: false, dismissed: false });
      expect(decisionFlags({ propose_query: { status: 'expired' } })).toEqual({
        applied: false,
        approved: false,
        dismissed: false,
      });
    });

    it('does not let a decision recorded on one arm leak into another', () => {
      // Only one arm runs per execution; the flags are ORs over all four outputs, so a
      // stale output on a non-running arm would fabricate a decision.
      expect(
        decisionFlags({ propose_risk_score: { decision: 'approved', status: 'succeeded' } })
          .dismissed
      ).toBe(false);
      expect(
        decisionFlags({ propose_exception: { decision: 'dismissed', status: 'no_action' } })
          .approved
      ).toBe(false);
    });
  });

  describe('the reject/dismiss arm', () => {
    const context = gateContext({ decision: 'dismissed', status: 'no_action' });

    it('dismisses the harvested alerts and marks them reviewed', () => {
      expect(fires('mark_alerts_dismissed', context)).toBe(true);
    });

    it('does not re-read the rule', () => {
      // The dismissal arm's engine assertion is "rule byte-identical". That only holds
      // because refetch (and the apply it stands for) never fires; a gate that applied
      // on dismissal flips it.
      expect(fires('refetch_rule', context)).toBe(false);
    });

    it('never tags the alerts as applied', () => {
      expect(fires('mark_alerts_applied', context)).toBe(false);
      expect(
        fires(
          'mark_alerts_applied',
          gateContext({ changeType: 'exception', decision: 'dismissed', status: 'no_action' })
        )
      ).toBe(false);
      expect(
        fires(
          'mark_alerts_applied',
          gateContext({ changeType: 'risk_score', decision: 'dismissed', status: 'no_action' })
        )
      ).toBe(false);
    });

    it('closes the investigation as dismissed', () => {
      expect(fires('close_investigation_dismissed', context)).toBe(true);
      expect(fires('close_investigation_applied', context)).toBe(false);
    });
  });

  describe('the approve arm', () => {
    it('applies when the action inside the gate succeeded', () => {
      // `applied` is what the approve arm asserts, and it is gated on the action's
      // `status == 'succeeded'` — a gate whose action never landed never flips it.
      const succeeded = gateContext({ decision: 'approved', status: 'succeeded' });
      expect(fires('refetch_rule', succeeded)).toBe(true);
      expect(fires('mark_alerts_applied', succeeded)).toBe(true);
      expect(fires('mark_alerts_dismissed', succeeded)).toBe(false);
    });

    it('never applies an approval whose action expired unsettled', () => {
      // Per the yaml's own contract the gate reports `decision: approved` only once
      // it settled that way — an approval whose action failed through every retry
      // settles as expired with NO decision, so nothing tags and the alerts wait
      // for the next sweep.
      const expired = gateContext({ status: 'expired' });
      expect(fires('refetch_rule', expired)).toBe(false);
      expect(fires('mark_alerts_applied', expired)).toBe(false);
      expect(fires('mark_alerts_dismissed', expired)).toBe(false);
      expect(fires('close_investigation_applied', expired)).toBe(false);
    });

    it('closes the investigation as approved once the decision is approved', () => {
      expect(fires('close_investigation_applied', gateContext({ decision: 'approved' }))).toBe(
        true
      );
      expect(fires('close_investigation_dismissed', gateContext({ decision: 'approved' }))).toBe(
        false
      );
    });

    it('tags an approved action-less manual hand-off as acknowledged, not applied', () => {
      const manual = gateContext({
        changeType: 'manual',
        decision: 'approved',
        status: 'no_action',
      });
      expect(fires('mark_alerts_acknowledged', manual)).toBe(true);
      expect(fires('mark_alerts_applied', manual)).toBe(false);
      expect(fires('refetch_rule', manual)).toBe(false);
    });

    it('keys the acknowledged tag on the manual arm, not on the decision axis', () => {
      // An approved query change (which carries the edit-rule action) is tagged applied,
      // never acknowledged — the acknowledged tag exists for the hand-off arm only.
      expect(
        fires(
          'mark_alerts_acknowledged',
          gateContext({ decision: 'approved', status: 'succeeded' })
        )
      ).toBe(false);
      expect(
        fires(
          'mark_alerts_acknowledged',
          gateContext({ decision: 'dismissed', status: 'no_action' })
        )
      ).toBe(false);
      // The key the step reads: `propose_manual` is the switch's default arm, so it is
      // the one that ran for `manual` AND for any value the action arms did not match.
      expect(conditionOf('mark_alerts_acknowledged')).toContain(
        "steps.propose_manual.output.decision == 'approved'"
      );
    });
  });

  describe("the approve arm's precondition for a query change", () => {
    /**
     * The query arm never tests the rule shape itself — it tests
     * `can_preview_query_change.output.supported`, so that computed flag is what decides
     * whether the proposal carries a backtest. The approval spec's approve arm asserts a
     * backtest, which is vacuous unless the seeded fixture really satisfies this.
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
      // The preview API cannot conditionally omit these, so the backtest is closed for
      // them — an approve arm on such a rule would assert a backtest that never happens.
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
    it('tags nothing when the gate recorded no decision', () => {
      // A gate timeout fails the run before the tag steps; a context where the output
      // exists but carries no decision must read the same way — no tags, no refetch.
      const context = gateContext({});
      expect(fires('mark_alerts_applied', context)).toBe(false);
      expect(fires('mark_alerts_dismissed', context)).toBe(false);
      expect(fires('mark_alerts_acknowledged', context)).toBe(false);
      expect(fires('refetch_rule', context)).toBe(false);
      // Nobody decided: the investigation stays open on purpose.
      expect(fires('close_investigation_applied', context)).toBe(false);
      expect(fires('close_investigation_dismissed', context)).toBe(false);
    });
  });

  describe('the manual-autonomy entry gate', () => {
    const entryContext = (entryDecision?: string) => ({
      steps: {
        propose_entry: entryDecision ? { output: { decision: entryDecision } } : { output: {} },
        record_entry: {
          output: { declined: entryDecision === 'dismissed' },
        },
      },
    });

    it('records `declined` only when the entry proposal was dismissed', () => {
      expect(
        evaluates(
          withValueOf('record_entry', 'declined'),
          { steps: { propose_entry: { output: { decision: 'dismissed' } } } },
          'record_entry.declined'
        )
      ).toBe(true);
      expect(
        evaluates(
          withValueOf('record_entry', 'declined'),
          { steps: { propose_entry: { output: { decision: 'approved' } } } },
          'record_entry.declined'
        )
      ).toBe(false);
      // Fail-closed: no decision is not a decline.
      expect(
        evaluates(
          withValueOf('record_entry', 'declined'),
          { steps: { propose_entry: { output: {} } } },
          'record_entry.declined'
        )
      ).toBe(false);
    });

    it('a declined review retires its alerts with reviewed+dismissed and stops the run', () => {
      // Otherwise the next sweep would open the same entry gate for the same alerts.
      const declined = entryContext('dismissed');
      expect(fires('mark_alerts_declined', declined)).toBe(true);
      expect(fires('stop_declined', declined)).toBe(true);
      expect(fires('close_investigation_declined', declined)).toBe(true);

      const approved = entryContext('approved');
      expect(fires('mark_alerts_declined', approved)).toBe(false);
      expect(fires('stop_declined', approved)).toBe(false);
    });

    it('the declined tag steps read the same flag the entry spec asserts on', () => {
      expect(conditionOf('mark_alerts_declined')).toContain(
        'steps.record_entry.output.declined == true'
      );
      expect(conditionOf('stop_declined')).toContain('steps.record_entry.output.declined == true');
    });
  });

  describe('the tags the approval spec asserts on', () => {
    it('read the same flags the arms assert on', () => {
      // The eval spec treats a landed `applied` tag as proof the rule was really patched,
      // so pin the wiring rather than trusting the tag name.
      expect(conditionOf('mark_alerts_applied')).toContain(
        'steps.record_proposal_action_decision.output.applied == true'
      );
      expect(conditionOf('mark_alerts_dismissed')).toContain(
        'steps.record_proposal_action_decision.output.dismissed == true'
      );
      expect(conditionOf('refetch_rule')).toContain(
        'steps.record_proposal_action_decision.output.applied == true'
      );
    });

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
    const spec = () =>
      readFileSync(join(__dirname, '..', 'evals/rule_tuning_approval.spec.ts'), 'utf8');

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
