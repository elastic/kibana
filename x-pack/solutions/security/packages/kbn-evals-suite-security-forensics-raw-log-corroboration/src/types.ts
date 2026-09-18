/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CorroboratedEvent {
  stage: string;
  evidence: string;
  query?: string;
  confidence: number;
}

export interface GapEvent {
  stage: string;
  expected: string;
  possibleCauses?: string;
}

/**
 * The report shape the worker is asked to produce. Not consumed by the gates
 * yet — the worker emits prose, so the spec measures that prose. Kept as the
 * target shape for when the worker returns structured output.
 */
export interface CorroborationReport {
  corroboratedEvents: CorroboratedEvent[];
  gapEvents: GapEvent[];
  confidence: number;
  unresolvedQuestions: string[];
}

/**
 * A single stage of a narrative, and whether raw telemetry exists for it.
 *
 * `stages` is the ground truth the fixture is built from: the seeder writes an
 * event for each `corroborated` stage and none for the rest. Before this
 * existed, the seeder wrote the same two events regardless of scenario, so a
 * scenario named "no raw telemetry" was still run against seeded telemetry and
 * its premise was untested.
 */
export interface NarrativeStage {
  id: string;
  /** Human-readable description of the telemetry that corroborates the stage. */
  evidence: string;
  /** True when in-scope telemetry exists. Drives seeding and the lower bound. */
  corroborated: boolean;
  /**
   * Seeds matching telemetry that does NOT corroborate the stage: it belongs to
   * another host, sits outside `scope.timeRange`, or both. Real log data a
   * careless read would count as confirmation — the point of a decoy scenario.
   * Never counted as corroborated.
   */
  decoy?: {
    host: string;
    outsideTime?: boolean;
  };
}

export interface CorroborationScenario {
  id: string;
  name: string;
  description: string;
  narrative: string;
  alertIds: string[];
  scope: {
    hosts: string[];
    timeRange: { from: string; to: string };
  };
  stages: NarrativeStage[];
  /**
   * Bounds the report is checked against. Deliberately two-sided: the earlier
   * shape had only `corroboratedCount` as a *minimum* and `gapCount` as a loose
   * *maximum*, so claiming corroboration the data cannot support was never
   * penalised and every scenario passed on vocabulary alone.
   */
  expected: {
    minCorroboratedCount: number;
    maxCorroboratedCount: number;
    minGapCount: number;
    maxGapCount: number;
    /**
     * Floor for the confidence the report must state about its own findings.
     *
     * Uniform across scenarios on purpose. The worker emits prose, so the suite
     * cannot define a calibrated per-scenario target; what this floor can
     * honestly assert is that the report COMMITS to a non-trivial confidence.
     * The gate extracts the value with `parseConfidence` and fails a report that
     * states none (previously `minConfidence` existed as a field nothing read).
     */
    minConfidence: number;
  };
}
