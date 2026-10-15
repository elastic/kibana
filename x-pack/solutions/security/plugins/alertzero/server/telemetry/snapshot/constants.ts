/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';

/**
 * Security Solution's per-space Advanced Setting that turns Attack Discovery Workflows on.
 * Duplicated rather than imported: AlertZero does not depend on Security Solution or Discoveries.
 */
export const ATTACK_DISCOVERY_WORKFLOWS_SETTING_ID =
  'securitySolution:enableAttackDiscoveryWorkflows' as const;

/**
 * The deployment-wide feature flag gating Attack Discovery Workflows, duplicated for the same
 * reason. It has no per-space value, so it counts as enabled in every space or in none.
 */
export const ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG =
  'securitySolution.attackDiscoveryWorkflowsEnabled' as const;

/** The flags `alertzero_feature_flags_snapshot` reports, in payload order. */
export const SNAPSHOT_FLAGS = [
  ALERTZERO_ENABLED_SETTING_ID,
  ATTACK_DISCOVERY_WORKFLOWS_SETTING_ID,
  ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG,
] as const;

export type AlertZeroSnapshotFlag = (typeof SNAPSHOT_FLAGS)[number];
