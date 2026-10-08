/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SpaceId } from '@kbn/core-spaces-common';
import { brandSpaceId, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SignificantEventsMaintenanceSummary } from '../../../common/maintenance/types';
import {
  DEFAULT_MAINTENANCE_STATE,
  isMaintenanceState,
  type SignificantEventsMaintenanceState,
} from '../../../common/maintenance/state_machine';
import type { SignificantEventsServer } from '../../types';
import type { PausedFeatureSettings } from './feature_settings';
import {
  LEGACY_DEFAULT_SPACE_WORKFLOW_IDS,
  type MaintenanceWorkflowTarget,
} from './managed_workflow_targets';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
  type SignificantEventsMaintenanceStateAttributes,
} from './saved_object';

/**
 * Maintenance SO attributes after branding spaceId fields at the SO → domain
 * boundary. Wire schemas remain `schema.string()`.
 */
export type LoadedMaintenanceState = Omit<
  SignificantEventsMaintenanceStateAttributes,
  'disabledWorkflows' | 'disabledRules' | 'pausedSettings'
> & {
  disabledWorkflows: MaintenanceWorkflowTarget[];
  disabledRules: MaintenanceRuleTarget[];
  pausedSettings?: PausedFeatureSettings;
};

/** A rule and the space containing its alerting saved object. */
export interface MaintenanceRuleTarget {
  id: string;
  spaceId: SpaceId;
}

/** Loaded state plus the SO version used for optimistic-concurrency writes. */
export interface VersionedMaintenanceState {
  attributes: LoadedMaintenanceState;
  version?: string;
}

/** Normalise a persisted (possibly newer/unknown) state string to a known state. */
export const normalizeState = (raw: string | undefined): SignificantEventsMaintenanceState =>
  // Fail-open: unknown values from a newer node are treated as enabled so
  // activity is not permanently blocked.
  raw && isMaintenanceState(raw) ? raw : DEFAULT_MAINTENANCE_STATE;

/**
 * The persisted summary stores `state` as a free-form string (see the saved
 * object); narrow it back to a known state when reading.
 */
export const normalizeSummary = (
  raw: SignificantEventsMaintenanceStateAttributes['lastSummary']
): SignificantEventsMaintenanceSummary | undefined =>
  raw ? { ...raw, state: normalizeState(raw.state) } : undefined;

/**
 * Executions are cancelled best-effort by `cancelAllActiveWorkflowExecutions`, which returns
 * no count, so every summary reports zero rather than the real number of cancellations.
 */
export const EXECUTIONS_CANCELLED_NOT_COUNTED = 0;

/** A summary with every count at zero, for a state with nothing swept yet. */
export const emptySummary = (
  state: SignificantEventsMaintenanceSummary['state']
): SignificantEventsMaintenanceSummary => ({
  state,
  executionsCancelled: EXECUTIONS_CANCELLED_NOT_COUNTED,
  workflowsDisabled: 0,
  rulesDisabled: 0,
  partialFailures: [],
});

/**
 * The document that marks a space paused before anything is swept: the existing inventory and
 * summary are kept so a re-pause never loses what an earlier pause recorded.
 */
export const buildPausedIntent = ({
  existing,
  actor,
}: {
  existing: LoadedMaintenanceState | undefined;
  actor: string | undefined;
}): LoadedMaintenanceState => ({
  state: 'paused',
  updatedAt: new Date().toISOString(),
  updatedBy: actor,
  disabledWorkflows: existing?.disabledWorkflows ?? [],
  disabledRules: existing?.disabledRules ?? [],
  pausedSettings: existing?.pausedSettings,
  lastSummary: normalizeSummary(existing?.lastSummary) ?? emptySummary('paused'),
});

const isNotFound = (error: unknown): boolean =>
  error instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(error);

const isConflict = (error: unknown): boolean =>
  error instanceof Error && SavedObjectsErrorHelpers.isConflictError(error);

/**
 * Brands persisted targets with the space of the document that holds them. A document only
 * ever records the inventory of its own space, so the document's space is the target's space.
 */
const brandOwnTargets = (
  spaceId: SpaceId,
  targets: ReadonlyArray<{ id: string }> | undefined
): Array<{ id: string; spaceId: SpaceId }> => (targets ?? []).map(({ id }) => ({ id, spaceId }));

/**
 * The scheduled-discovery restore list of a space's document. The persisted array can name
 * other spaces, but a document only restores its own space, so the others are dropped.
 */
const normalizePausedSettings = (
  spaceId: SpaceId,
  raw: SignificantEventsMaintenanceStateAttributes['pausedSettings']
): PausedFeatureSettings | undefined =>
  raw
    ? {
        continuousOnboardingWasEnabled: raw.continuousOnboardingWasEnabled,
        scheduledDiscoveryEnabledSpaceIds: raw.scheduledDiscoveryEnabledSpaceIds
          .filter((id) => id === spaceId)
          .map(brandSpaceId),
      }
    : undefined;

/**
 * Brand SO-loaded workflow targets once at the SO → domain boundary. Targets
 * recorded for the pre-per-space continuous onboarding documents of the default
 * space are dropped: those documents are deleted at startup and would only
 * produce "not found" failures. The legacy sync document is kept, since startup
 * only removes it once its per-space replacement is enabled.
 *
 * TODO: drop the legacy filter with the legacy default-space cleanup.
 * https://github.com/elastic/kibana/issues/294271
 */
const brandDisabledWorkflows = (
  spaceId: SpaceId,
  workflows: SignificantEventsMaintenanceStateAttributes['disabledWorkflows'] | undefined
): MaintenanceWorkflowTarget[] =>
  brandOwnTargets(spaceId, workflows).filter(
    ({ id }) => !(spaceId === DEFAULT_SPACE_ID && LEGACY_DEFAULT_SPACE_WORKFLOW_IDS.includes(id))
  );

/** Reads and writes the maintenance saved object of each space. */
export interface IMaintenanceStateStore {
  /** Loads a space's state with its SO version, or `undefined` when the space has no document. */
  readVersionedState(spaceId: SpaceId): Promise<VersionedMaintenanceState | undefined>;
  /** Loads a space's state, or `undefined` when the space has no document. */
  readState(spaceId: SpaceId): Promise<LoadedMaintenanceState | undefined>;
  /**
   * Writes the paused intent only if the document is unchanged since `current` was read.
   * Returns the claimed state, or `undefined` when another node won.
   */
  claimPausedIntent(params: {
    spaceId: SpaceId;
    current: VersionedMaintenanceState | undefined;
    updatedBy: string;
  }): Promise<LoadedMaintenanceState | undefined>;
  /** Overwrites a space's document. */
  writeState(
    spaceId: SpaceId,
    attributes: SignificantEventsMaintenanceStateAttributes
  ): Promise<void>;
  /** Removes a space's document, which reads as enabled afterwards. A missing document is fine. */
  deleteState(spaceId: SpaceId): Promise<void>;
}

/** Creates the store; every operation addresses one space's document. */
export const createMaintenanceStateStore = (
  server: SignificantEventsServer
): IMaintenanceStateStore => {
  // Lazy: this factory runs in plugin setup, before `server.core` is assigned in start().
  let internalClient: SavedObjectsClientContract | undefined;

  // The internal client skips the security extension but keeps the spaces extension, and is
  // rebound to each space. Route authz is the user gate (Nightshift read for status, manage for
  // pause/resume, manage and configure for reset). The SO is hidden and not listed on any
  // Nightshift privilege `savedObject` array, so a scoped client would check
  // `saved_object:significant-events-maintenance-state/get` and 403 every Nightshift-only user
  // once the document exists. Same pattern as run quotas.
  const getSoClient = (spaceId: SpaceId): SavedObjectsClientContract => {
    internalClient ??= server.core.savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE],
    });
    return internalClient.asScopedToNamespace(spaceId);
  };

  const readVersionedState = async (
    spaceId: SpaceId
  ): Promise<VersionedMaintenanceState | undefined> => {
    try {
      const so = await getSoClient(spaceId).get<SignificantEventsMaintenanceStateAttributes>(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID
      );
      // Brand spaceId fields once on SO load (wire schema stays schema.string()).
      return {
        attributes: {
          ...so.attributes,
          disabledWorkflows: brandDisabledWorkflows(spaceId, so.attributes.disabledWorkflows),
          disabledRules: brandOwnTargets(spaceId, so.attributes.disabledRules),
          pausedSettings: normalizePausedSettings(spaceId, so.attributes.pausedSettings),
        },
        version: so.version,
      };
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }
      throw error;
    }
  };

  const readState = async (spaceId: SpaceId): Promise<LoadedMaintenanceState | undefined> =>
    (await readVersionedState(spaceId))?.attributes;

  /**
   * Writes the paused intent only if the document is unchanged since `current`
   * was read, so when every Kibana node reacts to the same flag flip exactly one
   * of them sweeps a space. Returns the claimed state, or `undefined` if another
   * node won.
   */
  const claimPausedIntent = async ({
    spaceId,
    current,
    updatedBy,
  }: {
    spaceId: SpaceId;
    current: VersionedMaintenanceState | undefined;
    updatedBy: string;
  }): Promise<LoadedMaintenanceState | undefined> => {
    const claimed = buildPausedIntent({ existing: current?.attributes, actor: updatedBy });
    try {
      if (current) {
        await getSoClient(spaceId).update<SignificantEventsMaintenanceStateAttributes>(
          SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
          SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
          claimed,
          { version: current.version }
        );
      } else {
        await getSoClient(spaceId).create<SignificantEventsMaintenanceStateAttributes>(
          SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
          claimed,
          { id: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID, overwrite: false }
        );
      }
      return claimed;
    } catch (error) {
      if (isConflict(error)) {
        return undefined;
      }
      throw error;
    }
  };

  const writeState = async (
    spaceId: SpaceId,
    attributes: SignificantEventsMaintenanceStateAttributes
  ): Promise<void> => {
    await getSoClient(spaceId).create<SignificantEventsMaintenanceStateAttributes>(
      SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
      attributes,
      { id: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID, overwrite: true }
    );
  };

  /** Removes the document of a space, which reads as enabled afterwards. A missing document is fine. */
  const deleteState = async (spaceId: SpaceId): Promise<void> => {
    try {
      await getSoClient(spaceId).delete(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID
      );
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }
  };

  return { readVersionedState, readState, claimPausedIntent, writeState, deleteState };
};
