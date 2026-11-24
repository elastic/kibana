/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Id of the Known failures strategy; stamped on its signals and its rules' ownership tags. */
export const KNOWN_FAILURES_STRATEGY_ID = 'known_failures';

/**
 * Every tunable of Known failures, in one place for the learning loop. These are compiled into the
 * rule query and schedule, so a tuned value gives the rules new ids and the reconciler replaces them.
 */
export const KNOWN_FAILURES_SETTINGS = {
  /**
   * Closed minutes the rule counts, one bucket per minute, for its change point. Over 60 minutes
   * `CHANGE_POINT` found neither a doubling nor a slow climb on the replay, and over 120 or 180 it
   * lost the climb.
   */
  window_minutes: 360,
  /**
   * Newest minutes the rule returns counts for. Two more than `rule_every_minutes`, so a run that
   * starts late, or the first run of a replaced rule, leaves no minute unread, and a minute whose
   * documents arrived late is counted again.
   */
  newest_minutes: 7,
  /** Minutes before the newest ones that give the knowledge indicator's normal level. */
  baseline_minutes: 60,
  /** Last minutes whose median says whether a rise since the latest change point still holds. */
  recent_minutes: 15,
  /**
   * Oldest minutes of the window whose median is the earlier level. A climb too slow for
   * `CHANGE_POINT` to call a step or trend still shows as the last minutes standing above it.
   */
  earlier_minutes: 240,
  /**
   * Closed minutes left out at the end of the window, because their documents may still be
   * arriving. A minute read half full looks like a drop.
   */
  end_margin_minutes: 1,
  /** How often the rule runs, which is also how often the strategy reads its rows. */
  rule_every_minutes: 5,
} as const;
