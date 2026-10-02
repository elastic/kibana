/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { brandSpaceId, DEFAULT_SPACE_ID, type SpaceId } from '@kbn/core-spaces-common';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';

/** Global workflow sentinel (`*`) branded for SpaceId-typed maintenance targets. */
const BRANDED_GLOBAL_WORKFLOW_SPACE_ID = brandSpaceId(GLOBAL_WORKFLOW_SPACE_ID);

/**
 * Single source of truth for managed workflow IDs used by installers and by
 * Pause/Resume. Installers install subsets (feature-flagged); maintenance
 * sweeps the union of everything that can run Significant Events background
 * activity.
 */

/** Global-scope workflows installed by `install_workflows` (always-on core set). */
export const GLOBAL_CORE_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
] as const;

/** Scheduled discovery workflows controlled by the per-space Settings toggle. */
export const SCHEDULED_DISCOVERY_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
] as const;

/** Per-space knowledge indicator workflows, installed on demand when a space needs them. */
export const KNOWLEDGE_INDICATOR_SCHEDULED_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
] as const;

/** Scheduled workflows included in per-space maintenance sweeps. */
export const SCHEDULED_MAINTENANCE_WORKFLOW_IDS = [
  ...SCHEDULED_DISCOVERY_WORKFLOW_IDS,
  SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
  ...KNOWLEDGE_INDICATOR_SCHEDULED_WORKFLOW_IDS,
] as const;

/** Workflows installed once at the global scope (`spaceId: '*'`). */
export const GLOBAL_MAINTENANCE_WORKFLOW_IDS = [
  ...GLOBAL_CORE_WORKFLOW_IDS,
  SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW_ID,
] as const;

/**
 * Pre-per-space continuous onboarding workflows of the default space. Removed at startup and
 * dropped from recorded maintenance state.
 *
 * TODO: remove with the legacy default-space cleanup.
 * https://github.com/elastic/kibana/issues/294271
 */
export const LEGACY_DEFAULT_SPACE_WORKFLOW_IDS: readonly string[] = [
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
];

/**
 * Every workflow id that installers may create. Used by the drift test so a
 * new install target cannot land without also joining the maintenance sweep.
 */
export const ALL_INSTALLABLE_WORKFLOW_IDS = [
  ...GLOBAL_CORE_WORKFLOW_IDS,
  SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW_ID,
  ...SCHEDULED_MAINTENANCE_WORKFLOW_IDS,
] as const;

export interface MaintenanceWorkflowTarget {
  /** Workflow saved-object document id (matches the persisted `disabledWorkflows[].id`). */
  id: string;
  spaceId: SpaceId;
}

/**
 * The pre-per-space KI sync document of the default space. Startup keeps it until
 * `${id}-default` is enabled, since it is the only thing reconciling the default space until
 * then, so Pause and Resume still cover it. Missing documents are a no-op for both.
 *
 * TODO: remove with the legacy default-space cleanup.
 * https://github.com/elastic/kibana/issues/294271
 */
export const LEGACY_DEFAULT_SPACE_SYNC_TARGET: MaintenanceWorkflowTarget = {
  id: SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
  spaceId: DEFAULT_SPACE_ID,
};

/** Targets whose `enabled` flag is toggled by pause/resume. */
export const buildDisableTargets = (spaceIds: SpaceId[]): MaintenanceWorkflowTarget[] => [
  ...GLOBAL_MAINTENANCE_WORKFLOW_IDS.map((id) => ({
    id,
    spaceId: BRANDED_GLOBAL_WORKFLOW_SPACE_ID,
  })),
  LEGACY_DEFAULT_SPACE_SYNC_TARGET,
  ...spaceIds.flatMap((spaceId) =>
    SCHEDULED_MAINTENANCE_WORKFLOW_IDS.map((baseId) => ({
      id: `${baseId}-${spaceId}`,
      spaceId,
    }))
  ),
];

/**
 * Targets whose in-flight executions are cancelled on pause.
 * Global workflow *documents* live in `*`, but executions run in the triggering
 * space, so cancellation sweeps every space for those ids.
 */
export const buildCancelTargets = (spaceIds: SpaceId[]): MaintenanceWorkflowTarget[] => [
  ...spaceIds.flatMap((spaceId) => GLOBAL_MAINTENANCE_WORKFLOW_IDS.map((id) => ({ id, spaceId }))),
  LEGACY_DEFAULT_SPACE_SYNC_TARGET,
  ...spaceIds.flatMap((spaceId) =>
    SCHEDULED_MAINTENANCE_WORKFLOW_IDS.map((baseId) => ({
      id: `${baseId}-${spaceId}`,
      spaceId,
    }))
  ),
];
