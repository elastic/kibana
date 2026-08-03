/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertSource } from './narrative_utils';

/**
 * A narrative strategy converts an alert _source document into a
 * human-readable English string describing what happened.
 *
 * Strategies are evaluated in priority order (highest first).
 * The first strategy whose `match` returns true wins.
 */
export interface NarrativeStrategy {
  /** Unique identifier for debugging / logging. */
  readonly id: string;

  /**
   * Higher-priority strategies are evaluated first.
   * Use this to ensure specific strategies (e.g. threat_match)
   * take precedence over generic ones (e.g. network).
   */
  readonly priority: number;

  /** Returns true when this strategy can handle the given alert source. */
  match(source: AlertSource): boolean;

  /** Produces the narrative string for the matched alert. */
  build(source: AlertSource): string;
}
