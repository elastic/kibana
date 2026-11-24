/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Id of the Known failures strategy; stamped on its signals and its rules' ownership tags. */
export const KNOWN_FAILURES_STRATEGY_ID = 'known_failures';

/**
 * Every tunable of Known failures, in one place for the learning loop. The minutes are compiled into
 * the rule query and the schedule into the rule, so a tuned value gives the rules new ids and the
 * reconciler replaces them.
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
   * Closed minutes left out at the end of the window, because their documents may still be
   * arriving. A minute read half full looks like a drop.
   */
  end_margin_minutes: 1,
  /** How often the rule runs, which is also how often the strategy reads its rows. */
  rule_every_minutes: 5,
  /**
   * Minutes without a breached signal after which an event may close. Twice the schedule: a lasting
   * rise is reported once per run, so a shorter period would close its event between runs.
   */
  quiet_period_minutes: 10,
  /** The baseline check of the prototype: when a minute's count is unusual for the hour before it. */
  baseline: {
    /** Scaled median absolute deviations above the median. */
    mad_k: 3,
    /** Fewest extra matches that count as unusual, so a flat hour does not flag one extra line. */
    min_delta: 3,
    /** Standard deviations of the count floor, which widens with the indicator's burstiness. */
    count_noise_k: 3,
    /** Most the count floor widens for burstiness, so one huge burst cannot hide everything. */
    max_dispersion: 25,
  },
  /**
   * When an unusual minute opens an event. A single unusual minute does only when it is far above
   * the threshold, so a real spike is not delayed; otherwise a second one is needed within these
   * minutes. On the replay this took bursty noise from 9 and 13 false events to 0 and 1.
   */
  confirmation: {
    within_minutes: 3,
    /** How many times the threshold a single minute must reach to open an event on its own. */
    spike_factor: 2,
  },
  /** When the latest step or trend change is a rise that still holds. */
  lasting_rise: {
    max_pvalue: 0.05,
    /** Fewest minutes before the change, so the level before it is measured, not guessed. */
    min_before_minutes: 10,
    /** Fewest extra matches a minute the rise must add, whatever the level before it. */
    min_rise: 3,
  },
} as const;
