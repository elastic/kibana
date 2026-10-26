/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ActivityStep,
  SignalOutcome,
  SignalStrategyId,
  DismissalReason,
  EngineEventStatus,
  EvidenceVerdict,
  EventCloseReason,
  StrategyMode,
} from '@kbn/significant-events-detection-engine-plugin/common';

export const STRATEGY_LABELS: Record<SignalStrategyId, string> = {
  known_failure_queries: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.strategy.knownFailureQueries',
    {
      defaultMessage: 'Known failure queries',
    }
  ),
  health_checks: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.strategy.healthChecks',
    {
      defaultMessage: 'Health checks',
    }
  ),
  customer_alerts: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.strategy.customerAlerts',
    {
      defaultMessage: 'Customer alerts',
    }
  ),
  new_log_patterns: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.strategy.newLogPatterns',
    {
      defaultMessage: 'New log patterns',
    }
  ),
  learned_detectors: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.strategy.learnedDetectors',
    {
      defaultMessage: 'Learned detectors',
    }
  ),
  dependency_health: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.strategy.dependencyHealth',
    {
      defaultMessage: 'Dependency health',
    }
  ),
  change_regressions: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.strategy.changeRegressions',
    {
      defaultMessage: 'Change regressions',
    }
  ),
};

export const STRATEGY_ICONS: Record<SignalStrategyId, string> = {
  known_failure_queries: 'bullseye',
  health_checks: 'heart',
  customer_alerts: 'bell',
  new_log_patterns: 'sparkles',
  learned_detectors: 'beaker',
  dependency_health: 'link',
  change_regressions: 'timeline',
};

export const MODE_LABELS: Record<StrategyMode, string> = {
  off: i18n.translate('xpack.significantEventsApp.detectionEngine.mode.off', {
    defaultMessage: 'Off',
  }),
  trial: i18n.translate('xpack.significantEventsApp.detectionEngine.mode.trial', {
    defaultMessage: 'Trial',
  }),
  live: i18n.translate('xpack.significantEventsApp.detectionEngine.mode.live', {
    defaultMessage: 'Live',
  }),
};

export const STATUS_LABELS: Record<EngineEventStatus, string> = {
  active: i18n.translate('xpack.significantEventsApp.detectionEngine.status.active', {
    defaultMessage: 'Active',
  }),
  recovering: i18n.translate('xpack.significantEventsApp.detectionEngine.status.recovering', {
    defaultMessage: 'Recovering',
  }),
  inactive: i18n.translate('xpack.significantEventsApp.detectionEngine.status.inactive', {
    defaultMessage: 'Closed',
  }),
};

export const STATUS_COLORS: Record<EngineEventStatus, string> = {
  active: 'danger',
  recovering: 'warning',
  inactive: 'subdued',
};

/** What happened to a signal, in words. Every signal gets one, including the quiet ones. */
export const OUTCOME_LABELS: Record<SignalOutcome, string> = {
  background: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.background', {
    defaultMessage: 'Within normal',
  }),
  warming_up: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.warmingUp', {
    defaultMessage: 'Warming up',
  }),
  trial_would_raise: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.trial', {
    defaultMessage: 'Trial: would raise',
  }),
  continued: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.continued', {
    defaultMessage: 'Continued event',
  }),
  joined: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.joined', {
    defaultMessage: 'Joined event',
  }),
  new_event: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.newEvent', {
    defaultMessage: 'New event',
  }),
  reopened: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.reopened', {
    defaultMessage: 'Reopened event',
  }),
  held_by_dismissal: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.held', {
    defaultMessage: 'Held by dismissal',
  }),
  capped: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.capped', {
    defaultMessage: 'Daily cap reached',
  }),
  refuted: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.refuted', {
    defaultMessage: 'Refuted by evidence',
  }),
  deferred: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.deferred', {
    defaultMessage: 'Deferred: retried next run',
  }),
  conflict: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.conflict', {
    defaultMessage: 'Changed by someone else',
  }),
  unconfirmed: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.unconfirmed', {
    defaultMessage: 'Waiting for a second minute',
  }),
  supporting: i18n.translate('xpack.significantEventsApp.detectionEngine.outcome.supporting', {
    defaultMessage: 'Supporting evidence',
  }),
};

export const OUTCOME_COLORS: Record<SignalOutcome, string> = {
  background: 'default',
  warming_up: 'default',
  trial_would_raise: 'accent',
  continued: 'primary',
  joined: 'primary',
  new_event: 'danger',
  reopened: 'danger',
  held_by_dismissal: 'warning',
  capped: 'warning',
  refuted: 'success',
  deferred: 'warning',
  conflict: 'warning',
  unconfirmed: 'default',
  supporting: 'default',
};

export const STEP_LABELS: Record<ActivityStep, string> = {
  strategy: i18n.translate('xpack.significantEventsApp.detectionEngine.step.strategy', {
    defaultMessage: 'Strategy',
  }),
  rules: i18n.translate('xpack.significantEventsApp.detectionEngine.step.rules', {
    defaultMessage: 'Alerting v2 rules',
  }),
  baseline: i18n.translate('xpack.significantEventsApp.detectionEngine.step.baseline', {
    defaultMessage: 'Baseline check',
  }),
  identity: i18n.translate('xpack.significantEventsApp.detectionEngine.step.identity', {
    defaultMessage: 'Identity',
  }),
  join: i18n.translate('xpack.significantEventsApp.detectionEngine.step.join', {
    defaultMessage: 'Join proposal',
  }),
  agent: i18n.translate('xpack.significantEventsApp.detectionEngine.step.agent', {
    defaultMessage: 'Agent',
  }),
  state: i18n.translate('xpack.significantEventsApp.detectionEngine.step.state', {
    defaultMessage: 'State machine',
  }),
  cap: i18n.translate('xpack.significantEventsApp.detectionEngine.step.cap', {
    defaultMessage: 'Daily cap',
  }),
  trial: i18n.translate('xpack.significantEventsApp.detectionEngine.step.trial', {
    defaultMessage: 'Trial and replay',
  }),
  verifier: i18n.translate('xpack.significantEventsApp.detectionEngine.step.verifier', {
    defaultMessage: 'Verifier',
  }),
  publish: i18n.translate('xpack.significantEventsApp.detectionEngine.step.publish', {
    defaultMessage: 'Hand-off',
  }),
  learning: i18n.translate('xpack.significantEventsApp.detectionEngine.step.learning', {
    defaultMessage: 'Learning',
  }),
  operator: i18n.translate('xpack.significantEventsApp.detectionEngine.step.operator', {
    defaultMessage: 'Operator',
  }),
  run: i18n.translate('xpack.significantEventsApp.detectionEngine.step.run', {
    defaultMessage: 'Run',
  }),
};

/** Who owns a pipeline step, as the architecture colours it. */
export type StepTone = 'customer' | 'code' | 'ai' | 'event' | 'neutral';

/** Code-owned steps are green, the AI step yellow, customer-controlled blue, as in the design. */
export const STEP_TONES: Record<ActivityStep, StepTone> = {
  strategy: 'customer',
  rules: 'customer',
  baseline: 'code',
  identity: 'code',
  join: 'code',
  agent: 'ai',
  state: 'event',
  cap: 'code',
  trial: 'code',
  verifier: 'code',
  publish: 'neutral',
  learning: 'ai',
  operator: 'customer',
  run: 'neutral',
};

/**
 * Entries that repeat every minute, such as an open event carrying on; hidden from the logs
 * unless asked for, so the decisions stand out.
 */
export const ROUTINE_ACTIONS = new Set([
  'evaluated',
  'finished',
  'replayed',
  'note',
  'continued',
  'cooldown',
]);

export const DISMISSAL_LABELS: Record<DismissalReason, string> = {
  false_positive: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.dismissal.falsePositive',
    {
      defaultMessage: 'False positive',
    }
  ),
  expected_behavior: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.dismissal.expected',
    {
      defaultMessage: 'Expected behaviour',
    }
  ),
  duplicate: i18n.translate('xpack.significantEventsApp.detectionEngine.dismissal.duplicate', {
    defaultMessage: 'Duplicate',
  }),
  not_actionable: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.dismissal.notActionable',
    {
      defaultMessage: 'Not actionable',
    }
  ),
};

export const VERDICT_COLORS: Record<EvidenceVerdict, string> = {
  confirms: 'success',
  refutes: 'danger',
  inconclusive: 'default',
  off_topic: 'warning',
};

/** The agent's verdict on one signal's evidence, as a person would say it. */
export const VERDICT_LABELS: Record<EvidenceVerdict, string> = {
  confirms: i18n.translate('xpack.significantEventsApp.detectionEngine.verdict.confirms', {
    defaultMessage: 'Evidence confirms',
  }),
  refutes: i18n.translate('xpack.significantEventsApp.detectionEngine.verdict.refutes', {
    defaultMessage: 'Evidence refutes',
  }),
  inconclusive: i18n.translate('xpack.significantEventsApp.detectionEngine.verdict.inconclusive', {
    defaultMessage: 'Inconclusive',
  }),
  off_topic: i18n.translate('xpack.significantEventsApp.detectionEngine.verdict.offTopic', {
    defaultMessage: 'Evidence is off topic',
  }),
};

export const CLOSE_REASON_LABELS: Record<EventCloseReason, string> = {
  recovered: i18n.translate('xpack.significantEventsApp.detectionEngine.closeReason.recovered', {
    defaultMessage: 'recovered',
  }),
  operator: i18n.translate('xpack.significantEventsApp.detectionEngine.closeReason.operator', {
    defaultMessage: 'closed by a person',
  }),
  dismissed: i18n.translate('xpack.significantEventsApp.detectionEngine.closeReason.dismissed', {
    defaultMessage: 'dismissed',
  }),
  evidence_gone: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.closeReason.evidenceGone',
    {
      defaultMessage: 'closed when its evidence was gone',
    }
  ),
  source_removed: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.closeReason.sourceRemoved',
    {
      defaultMessage: 'closed when its source was removed',
    }
  ),
};

/** What each health check reports on, keyed by the check's part of the fingerprint. */
const HEALTH_CHECK_RULES: Record<string, string> = {
  error_ratio: i18n.translate('xpack.significantEventsApp.detectionEngine.healthRule.errorRatio', {
    defaultMessage:
      "Reports when more requests fail than the service's normal rate allows by chance: 5+ failures, 2+ points above normal, in two of three minutes",
  }),
  warning_ratio: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.healthRule.warningRatio',
    {
      defaultMessage:
        'Supports an event when 10% or more of the lines in a minute are warnings; never opens one',
    }
  ),
  latency_p95: i18n.translate('xpack.significantEventsApp.detectionEngine.healthRule.latency', {
    defaultMessage:
      "Reports when the minute's p95 latency, over 100+ durations, is twice that of the previous hour",
  }),
  latency_p50: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.healthRule.medianLatency',
    {
      defaultMessage:
        "Reports when the minute's median latency, over 20+ durations, is twice that of the previous hour",
    }
  ),
  silence: i18n.translate('xpack.significantEventsApp.detectionEngine.healthRule.silence', {
    defaultMessage:
      'Reports when log volume drops by 90% or more for longer than the service’s traffic allows by chance',
  }),
  source_silence: i18n.translate(
    'xpack.significantEventsApp.detectionEngine.healthRule.sourceSilence',
    {
      defaultMessage:
        'Reports when half or more of a source’s services go quiet in the same minute',
    }
  ),
};

/**
 * The rule that reports a signal, in words. Health checks are four rules in one strategy, so
 * their signals say which one fired rather than listing all four.
 */
export function signalRuleText({
  fingerprint,
  reportsWhen,
}: {
  fingerprint: string;
  reportsWhen?: string;
}): string | undefined {
  const [strategyPart, check] = fingerprint.split(':');
  if (strategyPart === 'health' && check && HEALTH_CHECK_RULES[check]) {
    return HEALTH_CHECK_RULES[check];
  }
  return reportsWhen;
}
