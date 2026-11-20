/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Id of the Known failures strategy; stamped on its signals and its rules' ownership tags. */
export const KNOWN_FAILURES_STRATEGY_ID = 'known_failures';

/**
 * Every tunable of Known failures, in one place for the learning loop. The window and recovery
 * settings are compiled into the rule query and the schedule into the rule, so a tuned value gives
 * the rules new ids and the reconciler replaces them.
 */
export const KNOWN_FAILURES_SETTINGS = {
  /** Closed minutes the rule's change point detection reads, one bucket per minute. */
  window_minutes: 360,
  /** Closed minutes that must all sit at or below the recovery threshold to call it recovered. */
  recovery_minutes: 5,
  /**
   * Closed minutes left out at the end of the window, because their documents may still be
   * arriving. A minute read half full looks like a dip so significant that it hides a real rise.
   */
  end_margin_minutes: 1,
  /** Minutes without a breached signal after which an event of this strategy may close. */
  quiet_period_minutes: 5,
  /** How often the rule runs. */
  rule_every: '5m',
} as const;

/** The tunables of Known failures, as the compiler and the mapper read them. */
export type KnownFailuresSettings = typeof KNOWN_FAILURES_SETTINGS;
