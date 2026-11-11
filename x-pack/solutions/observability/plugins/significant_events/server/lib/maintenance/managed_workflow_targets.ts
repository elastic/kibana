/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpaceId } from '@kbn/core-spaces-common';
import type { ManagedWorkflowId } from '@kbn/workflows/managed';
import {
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_ORCHESTRATOR_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';

/**
 * The shared workflows installed once at the global scope by `install_workflows`. They have no
 * `run_as`: the bound entry points call them with `run-as-mode: inherit`, so they run as the
 * space's service account.
 *
 * This file is the single source of truth for managed workflow IDs used by installers and by
 * Pause/Resume.
 */
export const GLOBAL_CORE_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
] as const;

/** Per-space bound entry points started by routes, which are blocked while the space is paused. */
export const BOUND_ENTRY_POINT_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_ORCHESTRATOR_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
] as const;

/** Scheduled discovery workflows controlled by the per-space Settings toggle. */
export const SCHEDULED_DISCOVERY_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID,
] as const;

/** Per-space knowledge indicator workflows that run on a schedule. */
export const KNOWLEDGE_INDICATOR_SCHEDULED_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
] as const;

/**
 * The scheduled workflows that space setup switches on, and so that Resume must switch on even
 * when Pause never recorded them: a space set up while paused leaves them off.
 */
export const SETUP_ENABLED_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
] as const;

/** Scheduled workflows included in per-space maintenance sweeps. */

export const SCHEDULED_MAINTENANCE_WORKFLOW_IDS = [
  ...SCHEDULED_DISCOVERY_WORKFLOW_IDS,
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  ...KNOWLEDGE_INDICATOR_SCHEDULED_WORKFLOW_IDS,
] as const;

/**
 * Every workflow id that installers may create. Used by the drift test so a
 * new install target cannot land without also joining the maintenance sweep.
 */
export const ALL_INSTALLABLE_WORKFLOW_IDS = [
  ...GLOBAL_CORE_WORKFLOW_IDS,
  ...BOUND_ENTRY_POINT_WORKFLOW_IDS,
  ...SCHEDULED_MAINTENANCE_WORKFLOW_IDS,
] as const;

/**
 * Whether a recorded target id still names a workflow this version installs, as the bare id or as
 * a per-space `${id}-${spaceId}` document. Targets recorded for the pre-bound workflows (the old
 * per-space sync, cleanup, continuous onboarding and scheduled documents) are not migrated: they
 * have no definition any more, so the sweep would only fail on them.
 */
export const isInstalledWorkflowDocumentId = (id: string): boolean =>
  ALL_INSTALLABLE_WORKFLOW_IDS.some((baseId) => id === baseId || id.startsWith(`${baseId}-`));

/**
 * The managed workflow type behind a per-space target document id, or `undefined` for a target that
 * is not an installed per-space workflow.
 */
export const getManagedWorkflowTypeId = ({
  id,
  spaceId,
}: {
  id: string;
  spaceId: string;
}): ManagedWorkflowId | undefined =>
  ALL_INSTALLABLE_WORKFLOW_IDS.find((baseId) => id === `${baseId}-${spaceId}`);

export interface MaintenanceWorkflowTarget {
  /** Workflow saved-object document id (matches the persisted `disabledWorkflows[].id`). */
  id: string;
  spaceId: SpaceId;
}

/** The per-space documents of {@link SETUP_ENABLED_WORKFLOW_IDS}. */
export const buildSetupEnabledTargets = (spaceId: SpaceId): MaintenanceWorkflowTarget[] =>
  SETUP_ENABLED_WORKFLOW_IDS.map((baseId) => ({ id: `${baseId}-${spaceId}`, spaceId }));

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
 * blocked while their space is paused.
 */
export const buildDisableTargets = (spaceIds: SpaceId[]): MaintenanceWorkflowTarget[] =>
  scheduledTargetsFor(spaceIds);

/**
 * Targets whose in-flight executions are cancelled on pause. The shared workflow *documents* live
 * in `*`, but their executions run in the triggering space, so cancellation sweeps each given
 * space for those ids, next to the space's own bound documents.
 */
export const buildCancelTargets = (spaceIds: SpaceId[]): MaintenanceWorkflowTarget[] => [
  ...spaceIds.flatMap((spaceId) => [
    ...GLOBAL_CORE_WORKFLOW_IDS.map((id) => ({ id, spaceId })),
    ...BOUND_ENTRY_POINT_WORKFLOW_IDS.map((baseId) => ({ id: `${baseId}-${spaceId}`, spaceId })),
  ]),
  ...buildDisableTargets(spaceIds),
];
