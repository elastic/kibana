/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertsSnapshotConfig {
  bucket: string;
  basePath: string;
  snapshotName?: string;
}

/**
 * Shared GCS-hosted security-alerts snapshot. Multiple security eval suites
 * (Attack Discovery, Alerts RAG, ...) restore from the same dataset so the
 * regression baselines stay aligned across suites.
 *
 * Defaults are pinned here for repeatability; suite-specific env vars
 * (see `resolveAlertsSnapshotConfig`) override for local experimentation
 * and CI variants.
 */
export const DEFAULT_ALERTS_SNAPSHOT_CONFIG: Required<AlertsSnapshotConfig> = {
  bucket: 'security-ai-datasets',
  basePath: 'attack-discovery/oh-my-malware/2026-03-26',
  snapshotName: 'alerts-snapshot',
};

/**
 * Resolve the alerts snapshot configuration from environment variables.
 *
 * - `envPrefix` is the per-suite namespace, e.g. `ATTACK_DISCOVERY_ALERTS_SNAPSHOT`
 *   or `ALERTS_RAG_ALERTS_SNAPSHOT`. Each suite owns its own override surface
 *   so changing one snapshot's coordinates doesn't silently affect another.
 * - Reads `${envPrefix}_DISABLE`, `${envPrefix}_BUCKET`, `${envPrefix}_BASE_PATH`,
 *   `${envPrefix}_NAME`.
 * - Returns `null` when `${envPrefix}_DISABLE=true` or when `GCS_CREDENTIALS`
 *   is missing (Elasticsearch needs repository-gcs creds wired up, which in our
 *   Scout setup is gated on `GCS_CREDENTIALS`). Returning `null` lets local
 *   runs skip restore gracefully instead of failing.
 */
export const resolveAlertsSnapshotConfig = (envPrefix: string): AlertsSnapshotConfig | null => {
  if (process.env[`${envPrefix}_DISABLE`] === 'true') return null;

  const bucket = process.env[`${envPrefix}_BUCKET`] ?? DEFAULT_ALERTS_SNAPSHOT_CONFIG.bucket;
  const basePath = process.env[`${envPrefix}_BASE_PATH`] ?? DEFAULT_ALERTS_SNAPSHOT_CONFIG.basePath;
  const snapshotName =
    process.env[`${envPrefix}_NAME`] ?? DEFAULT_ALERTS_SNAPSHOT_CONFIG.snapshotName;

  if (!process.env.GCS_CREDENTIALS) return null;

  return { bucket, basePath, snapshotName };
};
