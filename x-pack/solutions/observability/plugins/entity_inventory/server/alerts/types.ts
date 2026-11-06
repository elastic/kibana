/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EsqlScalar = string | number | boolean | null;
export type EsqlValue = EsqlScalar | readonly EsqlScalar[];

/** One entity as the generated list query returns it: `entity.id`, identity fields, attributes. */
export type EntityRow = Readonly<Record<string, EsqlValue>>;

/** Entity columns whose values must all equal an alert's group values for the alert to belong to the entity. */
export type MatchKey = readonly string[];

/** Where a key came from: the `rank`th way the definition's identity is written, or an extra key. */
export type KeySource = { kind: 'identity'; rank: number } | { kind: 'extra' };

export interface MatchKeyEntry {
  columns: MatchKey;
  source: KeySource;
}

/** The alerts of one value tuple of a match key, as one aggregated row. */
export interface AlertGroup {
  values: readonly string[];
  alertIds: readonly string[];
}

export interface KeyedAlertGroups {
  key: MatchKey;
  groups: readonly AlertGroup[];
}

export interface AlertMatchResult {
  source: 'classic' | 'v2';
  /** Distinct active alert ids attributed to each `entity.id`. Entities without alerts are absent. */
  alertIdsByEntity: ReadonlyMap<string, ReadonlySet<string>>;
  /** Active alerts the source holds, whether or not any entity claimed them. */
  activeAlerts: number;
}

export interface AlertMatchParams {
  keys: readonly MatchKey[];
  entities: readonly EntityRow[];
}

export interface AlertMatcher {
  source: AlertMatchResult['source'];
  match: (params: AlertMatchParams) => Promise<AlertMatchResult>;
}
