/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import type { SignificantEventsMaintenanceSummary } from '../../../common/maintenance/types';
import {
  DEFAULT_MAINTENANCE_STATE,
  isMaintenanceState,
  type SignificantEventsMaintenanceState,
} from '../../../common/maintenance/state_machine';
import type { SignificantEventsServer } from '../../types';
import type { PausedFeatureSettings } from './feature_settings';
import type { MaintenanceWorkflowTarget } from './managed_workflow_targets';
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
  'disabledWorkflows' | 'pausedSettings'
> & {
  disabledWorkflows: MaintenanceWorkflowTarget[];
  pausedSettings?: PausedFeatureSettings;
};

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

/** Reads and writes the single deployment-wide maintenance saved object. */
export const createMaintenanceStateStore = (server: SignificantEventsServer) => {
  // Lazy: this factory runs in plugin setup, before `server.core` is assigned
  // in start(). Route authz is the user gate (Nightshift read for status,
  // Nightshift manage for pause/resume, Streams manage for reset). This SO is hidden,
  // agnostic, and not listed on
  // any Nightshift privilege `savedObject` array. A scoped client then checks
  // `saved_object:significant-events-maintenance-state/get` and 403s every
  // Nightshift-only user once the document exists. Same pattern as run quotas.
  let soClient: SavedObjectsClientContract | undefined;

  const getSoClient = (): SavedObjectsClientContract => {
    soClient ??= server.core.savedObjects.createInternalRepository([
      SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
    ]);
    return soClient;
  };

  const normalizePausedSettings = (
    raw: SignificantEventsMaintenanceStateAttributes['pausedSettings']
  ): PausedFeatureSettings | undefined =>
    raw
      ? {
          continuousOnboardingWasEnabled: raw.continuousOnboardingWasEnabled,
          scheduledDiscoveryEnabledSpaceIds:
            raw.scheduledDiscoveryEnabledSpaceIds.map(brandSpaceId),
        }
      : undefined;

  /** Brand SO-loaded workflow targets once at the SO → domain boundary. */
  const brandDisabledWorkflows = (
    workflows: SignificantEventsMaintenanceStateAttributes['disabledWorkflows'] | undefined
  ): MaintenanceWorkflowTarget[] =>
    (workflows ?? []).map(({ id, spaceId }) => ({ id, spaceId: brandSpaceId(spaceId) }));

  const readVersionedState = async (): Promise<VersionedMaintenanceState | undefined> => {
    try {
      const so = await getSoClient().get<SignificantEventsMaintenanceStateAttributes>(
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID
      );
      // Brand spaceId fields once on SO load (wire schema stays schema.string()).
      return {
        attributes: {
          ...so.attributes,
          disabledWorkflows: brandDisabledWorkflows(so.attributes.disabledWorkflows),
          pausedSettings: normalizePausedSettings(so.attributes.pausedSettings),
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

  const readState = async (): Promise<LoadedMaintenanceState | undefined> =>
    (await readVersionedState())?.attributes;

  /**
   * Writes the paused intent only if the document is unchanged since `current`
   * was read, so when every Kibana node reacts to the same flag flip exactly one
   * of them sweeps. Returns the claimed state, or `undefined` if another node won.
   */
  const claimPausedIntent = async ({
    current,
    updatedBy,
  }: {
    current: VersionedMaintenanceState | undefined;
    updatedBy: string;
  }): Promise<LoadedMaintenanceState | undefined> => {
    const claimed: LoadedMaintenanceState = {
      disabledWorkflows: [],
      disabledRuleIds: [],
      ...current?.attributes,
      state: 'paused',
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    try {
      if (current) {
        await getSoClient().update<SignificantEventsMaintenanceStateAttributes>(
          SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
          SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
          claimed,
          { version: current.version }
        );
      } else {
        await getSoClient().create<SignificantEventsMaintenanceStateAttributes>(
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
    attributes: SignificantEventsMaintenanceStateAttributes
  ): Promise<void> => {
    await getSoClient().create<SignificantEventsMaintenanceStateAttributes>(
      SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
      attributes,
      { id: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID, overwrite: true }
    );
  };

  return { readVersionedState, readState, claimPausedIntent, writeState };
};
