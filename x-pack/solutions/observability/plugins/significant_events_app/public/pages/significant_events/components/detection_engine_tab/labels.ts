/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ActivityStep,
  DetectionOutcome,
  DetectionStrategyId,
  DismissalReason,
  EngineEventStatus,
  StrategyMode,
} from '@kbn/significant-events-detection-engine-plugin/common';

export const STRATEGY_LABELS: Record<DetectionStrategyId, string> = {
  ki_rules: i18n.translate('xpack.significantEventsApp.detectionEngine.strategy.kiRules', {
    defaultMessage: 'Rules from KIs',
  }),
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
};

export const STRATEGY_ICONS: Record<DetectionStrategyId, string> = {
  ki_rules: 'bullseye',
  health_checks: 'heart',
  customer_alerts: 'bell',
  new_log_patterns: 'sparkles',
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

/** What happened to a detection, in words. Every detection gets one, including the quiet ones. */
export const OUTCOME_LABELS: Record<DetectionOutcome, string> = {
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
};

export const OUTCOME_COLORS: Record<DetectionOutcome, string> = {
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

/** Steps that repeat every minute; hidden from the activity log unless asked for. */
export const ROUTINE_ACTIONS = new Set(['evaluated', 'finished', 'replayed', 'note']);

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
