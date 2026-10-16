/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object({
  // Reserved: Core skips loading the plugin entirely when false.
  enabled: schema.boolean({ defaultValue: true }),
  run: schema.object({
    /**
     * A run stops starting new buckets after this long, so it ends well inside the scheduler's
     * five-minute workflow timeout and its own lease.
     */
    timeBudget: schema.duration({ defaultValue: '150s' }),
    /** How long a run holds the space's lease. Must stay above the time budget. */
    leaseDuration: schema.duration({ defaultValue: '5m' }),
    /** Most buckets one run evaluates per strategy when it is catching up. */
    maxBucketsPerRun: schema.number({ defaultValue: 10, min: 1, max: 120 }),
    /**
     * When the engine is behind by more than this, it skips ahead instead of replaying the gap,
     * and records the skipped minutes. Old buckets would only raise stale events.
     */
    maxCatchUp: schema.duration({ defaultValue: '2h' }),
    /** Most rows one run reads from `.rule-events`; the rest wait for the next run. */
    maxRuleEventRows: schema.number({ defaultValue: 200_000, min: 1_000, max: 2_000_000 }),
    /** Most detections that reach discovery in one run, strongest first. */
    maxDetectionsPerRun: schema.number({ defaultValue: 2_000, min: 10, max: 50_000 }),
    /** Detections that waited for the agent budget, kept for the next run. */
    maxPendingDetections: schema.number({ defaultValue: 500, min: 0, max: 10_000 }),
  }),
  agent: schema.object({
    /** One discovery call never takes longer than this. */
    timeout: schema.duration({ defaultValue: '90s' }),
  }),
  rules: schema.object({
    /**
     * The engine's Alerting v2 rules are rebuilt when their inputs change, and at least this
     * often, so a source gaining a field (such as `event.duration`) gets the check it enables.
     */
    reconcileInterval: schema.duration({ defaultValue: '30m' }),
  }),
});

export type DetectionEngineConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<DetectionEngineConfig> = {
  schema: configSchema,
  // The demo lab was removed; an old kibana.yml that still sets it must not stop Kibana starting.
  deprecations: ({ unused }) => [unused('lab.enabled', { level: 'warning' })],
};
