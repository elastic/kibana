/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

/**
 * Discriminant for the empty / degraded state being rendered.
 *
 * Each reason maps to a specific icon, title, description and default action
 * inside the panel. Adding a new reason here is a deliberate widening of the
 * vocabulary the UI uses to talk to the user about engine state — prefer
 * extending this enum rather than passing free-form copy through `title` /
 * `description`, so the wording stays consistent across surfaces.
 */
export type RiskScoreStatusReason =
  /** Engine ran successfully but produced no scores in the current window. */
  | 'no_matching_alerts'
  /** Engine is installed but has not completed a scoring run yet. */
  | 'engine_never_run'
  /** Engine is installed but currently disabled by the user. */
  | 'engine_disabled'
  /** Engine has not been installed in this space. */
  | 'engine_not_installed'
  /** Catch-all when no other reason can be confidently inferred. */
  | 'unknown';

/**
 * Optional diagnostic facts displayed below the description.
 *
 * Every field is independently optional — the {@link FactsList} subcomponent
 * renders only the rows it has data for. Callers should pass whatever they can
 * cheaply produce and omit the rest rather than synthesising placeholder
 * values.
 */
export interface RiskScoreStatusFacts {
  /**
   * ISO timestamp of the maintainer task's last successful run.
   *
   * Not exposed by `GET /api/risk_score/engine/status` today; left in the type
   * surface so callers can populate it once a backend route is available.
   */
  lastSuccessTimestamp?: string;
  /** Total entities present in the entity store for this surface's scope. */
  entitiesTracked?: number;
  /** The engine's configured scoring window. */
  scoringWindow?: {
    start: string;
    end: string;
  };
  /**
   * Count of alerts that matched the engine's configured filters in the
   * scoring window. May be `undefined` if the surface has not (or cannot)
   * compute it.
   */
  matchingAlertsCount?: number;
}

export interface RiskScoreStatusAction {
  label: ReactNode;
  onClick: () => void;
  'data-test-subj'?: string;
}

export interface RiskScoreStatusPanelProps {
  /** Reason for the empty / degraded state. */
  reason: RiskScoreStatusReason;
  /** Optional diagnostic facts; omitted facts are not rendered. */
  facts?: RiskScoreStatusFacts;
  /**
   * Primary action button. Defaults are wired by `reason`; pass `null` to
   * suppress the default (e.g. when the panel is already on the destination
   * page), or pass an object to override.
   */
  primaryAction?: RiskScoreStatusAction | null;
  /**
   * Visual density.
   * - `panel`: full {@link EuiEmptyPrompt}, for empty surfaces (home page).
   * - `callout`: {@link EuiCallOut}, for situated explanations above tables
   *   (management preview).
   * - `inline`: bare text only, for single-entity surfaces (flyout).
   */
  variant?: 'panel' | 'callout' | 'inline';
  /** Override the default title for the given reason. */
  title?: ReactNode;
  /** Override the default description for the given reason. */
  description?: ReactNode;
  'data-test-subj'?: string;
}
