/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seed profiles.
 *
 * `clean` is four hand-written chains (16 alerts) used by the per-chain
 * provided-alerts datasets.
 *
 * `dense` seeds a larger alert population so discovery counts are measured at
 * a realistic volume rather than on four alerts. It exists because a triage
 * model that looks good correlating 4 alerts is not shown to correlate 90+;
 * volume is the variable under test, so it must be a committed input rather
 * than whatever happened to sit in a live index on the day.
 *
 * `full` is clean plus cloud scenarios and background noise (see
 * `full_scenarios.ts` / `background_noise.ts`), used by the on-demand
 * full-profile discrimination cohort.
 */
export type Ad2SeedProfile = 'clean' | 'dense' | 'full';

export type Ad2ScenarioOs = 'windows' | 'linux' | 'macos';

export type Ad2ScenarioSeverity = 'low' | 'medium' | 'high' | 'critical';

export type Ad2ScenarioEventType = 'process' | 'network' | 'file' | null;

export interface Ad2ScenarioStep {
  readonly ruleName: string;
  readonly severity: Ad2ScenarioSeverity;
  readonly riskScore: number;
  readonly message: string;
  readonly processName: string | null;
  readonly commandLine: string | null;
  readonly eventType: Ad2ScenarioEventType;
  readonly context: string | null;
}

export interface Ad2ScenarioDefinition {
  readonly key: string;
  readonly title: string;
  readonly host: string;
  readonly os: Ad2ScenarioOs;
  readonly user: string;
  readonly startHoursAgo: number;
  readonly raw: boolean;
  readonly dataset?: string;
  readonly category?: string;
  readonly steps: readonly Ad2ScenarioStep[];
}

export interface Ad2IndexedAlert {
  readonly id: string;
  readonly source: Record<string, unknown>;
}

export interface Ad2IndexedRawEvent {
  readonly index: string;
  readonly id: string;
  readonly source: Record<string, unknown>;
}

export interface Ad2SeedPlan {
  readonly profile: Ad2SeedProfile;
  /** The run marker every document in this plan is identified by. */
  readonly runMarker: string;
  readonly scenarioKeys: readonly string[];
  readonly alerts: readonly Ad2IndexedAlert[];
  readonly rawEvents: readonly Ad2IndexedRawEvent[];
  readonly noiseAlertIds?: readonly string[];
}

/**
 * What a cleanup or a count is allowed to reach: the marker the seeding run
 * stamped on the documents it wrote (`run_marker.ts`).
 *
 * `Ad2SeedSummary` satisfies it, so an `afterAll` hands back exactly what its
 * `beforeAll` received and cannot name a scope it did not seed.
 */
export interface Ad2SeedRunScope {
  readonly runMarker: string;
}

export interface Ad2SeedSummary extends Ad2SeedRunScope {
  readonly profile: Ad2SeedProfile;
  readonly scenarioKeys: readonly string[];
  readonly alertCount: number;
  readonly rawEventCount: number;
  readonly noiseAlertCount?: number;
}
