/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VitalRating } from '../core_web_vitals';
import type { VitalRatings } from './applications';

export type MeasureUnit = 'count' | 'ms' | 'score' | 'rate' | 'ratio';

/** `neutral` is a change that is neither better nor worse, such as traffic; `unknown` lacks a value. */
export type ChangeDirection = 'better' | 'worse' | 'unchanged' | 'neutral' | 'unknown';

export interface ScorecardMeasure {
  id: string;
  label: string;
  unit: MeasureUnit;
  value: number | null;
  previous: number | null;
  /** Relative change to the previous period, `null` without both values or a previous of zero. */
  change: number | null;
  direction: ChangeDirection;
  /** Google's rating of a web vital, `null` for the other measures or without a value. */
  rating: VitalRating | null;
  /** Share of samples per rating of a web vital. */
  ratings: VitalRatings | null;
}

export interface ScorecardSection {
  id: 'traffic' | 'webVitals';
  title: string;
  measures: ScorecardMeasure[];
}

export interface ScorecardPeriod {
  start: number;
  end: number;
}

export interface ScorecardReport {
  serviceName: string;
  environment?: string;
  /** The environments of the application, for a picker. */
  environments: string[];
  period: ScorecardPeriod;
  previousPeriod: ScorecardPeriod;
  generatedAt: number;
  sections: ScorecardSection[];
}
