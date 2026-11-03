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

/** A column of an entity row paired with the alert field that carries the same value. */
export interface MatchKeyColumn {
  entityColumn: string;
  alertField: string;
}

/** Columns that must all equal an alert's values for the alert to belong to the entity. */
export type MatchKey = readonly MatchKeyColumn[];

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

export interface AlertMatcher {
  source: AlertMatchResult['source'];
  match: (params: { type: string; entities: readonly EntityRow[] }) => Promise<AlertMatchResult>;
}
