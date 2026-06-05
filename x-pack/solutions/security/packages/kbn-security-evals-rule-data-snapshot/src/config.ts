/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RuleDataSnapshotConfig {
  bucket: string;
  basePath: string;
  snapshotName?: string;
}

/**
 * Shared GCS-hosted security rule-data snapshot.
 *
 * Multiple security eval suites restore from the same dataset so
 * baselines stay aligned. Defaults are pinned here for repeatability;
 * suite-specific env vars (see `resolveRuleDataSnapshotConfig`) override
 * for local experimentation and CI variants.
 */
export const DEFAULT_RULE_DATA_SNAPSHOT_CONFIG: Required<RuleDataSnapshotConfig> = {
  bucket: 'security-ai-datasets',
  basePath: 'rule-data/2026-06-05',
  snapshotName: 'security-ai-rules-v1',
};

/**
 * Resolve the rule-data snapshot configuration from environment variables.
 *
 * - `envPrefix` is the per-suite namespace, e.g. `SECURITY_AI_RULES`.
 * - Reads `${envPrefix}_DISABLE`, `${envPrefix}_BUCKET`,
 *   `${envPrefix}_BASE_PATH`, `${envPrefix}_NAME`.
 * - Returns `null` when `${envPrefix}_DISABLE=true` or when
 *   `GCS_CREDENTIALS` is missing (Elasticsearch needs repository-gcs
 *   creds wired up, which in Scout is gated on `GCS_CREDENTIALS`).
 */
export const resolveRuleDataSnapshotConfig = (
  envPrefix: string
): RuleDataSnapshotConfig | null => {
  if (process.env[`${envPrefix}_DISABLE`] === 'true') return null;

  const bucket =
    process.env[`${envPrefix}_BUCKET`] ?? DEFAULT_RULE_DATA_SNAPSHOT_CONFIG.bucket;
  const basePath =
    process.env[`${envPrefix}_BASE_PATH`] ?? DEFAULT_RULE_DATA_SNAPSHOT_CONFIG.basePath;
  const snapshotName =
    process.env[`${envPrefix}_NAME`] ?? DEFAULT_RULE_DATA_SNAPSHOT_CONFIG.snapshotName;

  if (!process.env.GCS_CREDENTIALS) return null;

  return { bucket, basePath, snapshotName };
};
