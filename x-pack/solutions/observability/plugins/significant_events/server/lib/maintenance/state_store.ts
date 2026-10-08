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

export const emptySummary = (
  state: SignificantEventsMaintenanceSummary['state']
): SignificantEventsMaintenanceSummary => ({
  state,
  executionsCancelled: 0,
  workflowsDisabled: 0,
  rulesDisabled: 0,
  partialFailures: [],
});

/** The targets that belong to `spaceId`; anything recorded for another space (or `*`) is dropped. */
const ownTargets = <T extends { spaceId: string }>(
  spaceId: SpaceId,
  targets: T[] | undefined
): T[] => (targets ?? []).filter((target) => target.spaceId === spaceId);

/**
 * A document holds the inventory of its own space only. The document stored while
 * the type was `agnostic` still lists targets of every space, so those are dropped
 * on read and again on write, which cleans the document the next time it is saved.
 */
const restrictToSpace = (
  spaceId: SpaceId,
  attributes: SignificantEventsMaintenanceStateAttributes
): SignificantEventsMaintenanceStateAttributes => ({
  ...attributes,
  disabledWorkflows: ownTargets(spaceId, attributes.disabledWorkflows),
  disabledRules: ownTargets(spaceId, attributes.disabledRules),
  ...(attributes.pausedSettings
    ? {
        pausedSettings: {
          ...attributes.pausedSettings,
          scheduledDiscoveryEnabledSpaceIds:
            attributes.pausedSettings.scheduledDiscoveryEnabledSpaceIds.filter(
              (id) => id === spaceId
            ),
        },
      }
    : {}),
});

/** Reads and writes the maintenance saved object of each space. */
export const createMaintenanceStateStore = (server: SignificantEventsServer) => {
  // Lazy: this factory runs in plugin setup, before `server.core` is assigned
  // in start(). Route authz is the user gate (Nightshift read for status,
  // Nightshift manage for pause/resume, Nightshift manage and configure for reset). This SO is hidden
  // and not listed on any Nightshift privilege `savedObject` array. A scoped client then checks
  // `saved_object:significant-events-maintenance-state/get` and 403s every
  // Nightshift-only user once the document exists. So the internal client is used, which skips
  // the security extension but keeps the spaces extension, and is rebound to each space.
  // Same pattern as run quotas.
  let internalClient: SavedObjectsClientContract | undefined;
  const spaceClients = new Map<SpaceId, SavedObjectsClientContract>();

  const getSoClient = (spaceId: SpaceId): SavedObjectsClientContract => {
    internalClient ??= server.core.savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE],
    });
    let spaceClient = spaceClients.get(spaceId);
    if (!spaceClient) {
      spaceClient = internalClient.asScopedToNamespace(spaceId);
      spaceClients.set(spaceId, spaceClient);
    }
    return spaceClient;
  };

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
    ownTargets(spaceId, workflows)
      .filter(
        ({ id, spaceId: targetSpaceId }) =>
          !(targetSpaceId === DEFAULT_SPACE_ID && LEGACY_DEFAULT_SPACE_WORKFLOW_IDS.includes(id))
      )
      .map(({ id }) => ({ id, spaceId }));

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
          disabledRules: ownTargets(spaceId, so.attributes.disabledRules).map(({ id }) => ({
            id,
            spaceId,
          })),
          pausedSettings: normalizePausedSettings(spaceId, so.attributes.pausedSettings),
        },
        version: so.version,
      };
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
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
    const claimed: LoadedMaintenanceState = {
      disabledWorkflows: [],
      disabledRules: [],
      ...current?.attributes,
      state: 'paused',
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
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
      if (error instanceof Error && SavedObjectsErrorHelpers.isConflictError(error)) {
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
      restrictToSpace(spaceId, attributes),
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
      if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        throw error;
      }
    }
  };

  return { readVersionedState, readState, claimPausedIntent, writeState, deleteState };
};
