/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** What a recovery investigation can do to find why an alert fired, why it closed, and what drives it. */
export interface CausalStrategy {
  id: string;
  group: 'alert' | 'closure' | 'symptom' | 'history' | 'external' | 'rigor';
  label: string;
  /** What running it means, shown to the judge. */
  description: string;
  /** Only the report can show it, so the judge reads the report rather than the tool calls. */
  reportOnly?: boolean;
}

export const CAUSAL_STRATEGIES: readonly CausalStrategy[] = [
  {
    id: 'alert_record',
    group: 'alert',
    label: "Read the alert's own record",
    description:
      'Read the alert document or its state transitions: status, reason, consecutive matches, flapping, start and end.',
  },
  {
    id: 'rule_definition',
    group: 'alert',
    label: "Read the rule's definition",
    description: 'Read the rule: its query or condition, threshold, look-back window and revision.',
  },
  {
    id: 'rule_execution_trace',
    group: 'closure',
    label: 'Rule execution record',
    description:
      "Read the rule's execution log or the event log around the recovery: run outcomes, gaps between runs, errors.",
  },
  {
    id: 'condition_rechecked',
    group: 'closure',
    label: 'Re-check the condition at recovery',
    description:
      "Re-evaluate the rule's own condition against raw data at the moment it recovered, to see whether it still matched.",
  },
  {
    id: 'suppression_check',
    group: 'closure',
    label: 'Mute, snooze, maintenance window',
    description:
      'Check whether a mute, snooze, maintenance window or flapping setting could have closed or hidden the alert.',
  },
  {
    id: 'before_during_after',
    group: 'symptom',
    label: 'Before / during / after windows',
    description:
      'Measure the alert-driving signal in exact windows before, during and after the recovery.',
  },
  {
    id: 'control_comparison',
    group: 'symptom',
    label: 'Compare with a control',
    description:
      'Compare with siblings, other entities or other deployments that did not alert, to tell a specific fault from a background condition.',
  },
  {
    id: 'request_level',
    group: 'symptom',
    label: 'Request-level evidence',
    description:
      'Read individual failing requests: traces, transactions or error logs of the service, not only aggregate metrics.',
  },
  {
    id: 'mechanism_link',
    group: 'symptom',
    label: 'Direct mechanism link',
    description:
      'Tie the cause to the symptom with a direct join (the same trace or request id, the same error text), not co-occurring rates.',
  },
  {
    id: 'episode_history',
    group: 'history',
    label: 'Earlier episodes',
    description:
      "List this rule and entity's earlier episodes with their starts, ends and durations.",
  },
  {
    id: 'periodicity',
    group: 'history',
    label: 'Periodicity test',
    description:
      'Test whether starts, ends or durations repeat at a fixed clock time or interval, which would point to a scheduled process.',
  },
  {
    id: 'refire_check',
    group: 'history',
    label: 'Did it re-open?',
    description: 'Check whether the alert re-opened after the recovery.',
  },
  {
    id: 'change_tracking',
    group: 'external',
    label: 'Deploys, config, versions',
    description:
      'Look for deploys, rollbacks, configuration or feature-flag changes, rule revisions, or version and node changes near onset and recovery.',
  },
  {
    id: 'platform_events',
    group: 'external',
    label: 'Restarts and platform events',
    description:
      'Look for restarts, scaling, scheduling or other infrastructure events of the services involved near onset and recovery.',
  },
  {
    id: 'source_code',
    group: 'external',
    label: 'Read the source',
    description: 'Read the code that produces the error or the rule behavior.',
  },
  {
    id: 'hypothesis_revision',
    group: 'rigor',
    label: 'Revise earlier hypotheses',
    description:
      'Explicitly keep, downgrade or dismiss each earlier hypothesis, with the evidence that decided it.',
    reportOnly: true,
  },
  {
    id: 'gaps_named',
    group: 'rigor',
    label: 'Name the gaps',
    description:
      'Name each source that could not be reached or queried and the access that would close the gap.',
    reportOnly: true,
  },
];

export const CAUSAL_STRATEGY_IDS: readonly string[] = CAUSAL_STRATEGIES.map(({ id }) => id);

export type StrategyStatus = 'ran' | 'blocked' | 'not_run';

/**
 * A strategy counts as run when the agent executed it; one it tried against a source it could not
 * read counts for half, because it did the work and the access is what failed.
 */
export const checklistScore = (statuses: Record<string, StrategyStatus>): number => {
  const total = CAUSAL_STRATEGIES.length;
  const points = CAUSAL_STRATEGIES.reduce((sum, { id }) => {
    const status = statuses[id];
    return sum + (status === 'ran' ? 1 : status === 'blocked' ? 0.5 : 0);
  }, 0);
  return points / total;
};
