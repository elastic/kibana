/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpaceId } from '@kbn/core-spaces-common';
import {
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SOURCE_RECONCILIATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';

/**
 * Global-scope workflows installed by `install_workflows` (always-on core set).
 *
 * This file is the single source of truth for managed workflow IDs used by installers and by
 * Pause/Resume. Installers install subsets (feature-flagged); maintenance sweeps the union of
 * everything that can run Significant Events background activity.
 */
export const GLOBAL_CORE_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SOURCE_RECONCILIATION_WORKFLOW_ID,
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

/** Per-space scheduled documents are installed as `${baseId}-${spaceId}`. */
const scheduledTargetsFor = (spaceIds: SpaceId[]): MaintenanceWorkflowTarget[] =>
  spaceIds.flatMap((spaceId) =>
    SCHEDULED_MAINTENANCE_WORKFLOW_IDS.map((baseId) => ({
      id: `${baseId}-${spaceId}`,
      spaceId,
    }))
  );

/**
 * Targets whose `enabled` flag is toggled by pause/resume. Only the per-space scheduled
 * documents of the given spaces: the global workflows (`*`) belong to every space, so
 * pausing one space must not turn them off. The manual ones are started by routes that are
 * blocked while their space is paused. The only event-triggered one,
 * `INVESTIGATION_COMPLETED`, just attaches a finished investigation to its event and starts
 * no new background work, so it is safe to leave enabled.
 */
export const buildDisableTargets = (spaceIds: SpaceId[]): MaintenanceWorkflowTarget[] =>
  scheduledTargetsFor(spaceIds);

/**
 * Targets whose in-flight executions are cancelled on pause.
 * Global workflow *documents* live in `*`, but executions run in the triggering
 * space, so cancellation sweeps each given space for those ids.
 */
export const buildCancelTargets = (spaceIds: SpaceId[]): MaintenanceWorkflowTarget[] => [
  ...spaceIds.flatMap((spaceId) => GLOBAL_MAINTENANCE_WORKFLOW_IDS.map((id) => ({ id, spaceId }))),
  ...buildDisableTargets(spaceIds),
];
