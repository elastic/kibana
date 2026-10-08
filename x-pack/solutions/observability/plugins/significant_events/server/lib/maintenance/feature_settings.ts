/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { SpaceId } from '@kbn/core-spaces-common';
import {
  OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import { SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { SignificantEventsServer } from '../../types';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import type { GetScopedClients } from '../../routes/types';
import type { MaintenanceAccess } from './maintenance_access';
import {
  SCHEDULED_DISCOVERY_WORKFLOW_IDS,
  type MaintenanceWorkflowTarget,
} from './managed_workflow_targets';
import { toMessage } from './to_message';

/**
 * Snapshot of feature toggles that Pause turned off so Resume can restore only
 * what was previously enabled (and leave previously-disabled features alone).
 *
 * Continuous onboarding is not recorded here. Its per-space workflow document is
 * in the disabled-workflows inventory, and Resume derives the setting from it.
 * `continuousOnboardingWasEnabled` only exists because the saved object schema
 * requires it. It is always written `false` and ignored on read.
 */
export interface PausedFeatureSettings {
  continuousOnboardingWasEnabled: boolean;
  scheduledDiscoveryEnabledSpaceIds: SpaceId[];
}

/**
 * Toggles that still read on after Reset failed to turn them off. Continuous
 * onboarding is per space, so it lists the spaces rather than carrying a flag.
 */
export interface StillOnFeatureSettings extends PausedFeatureSettings {
  continuousOnboardingSpaceIds: SpaceId[];
}

/** No toggle on. A fresh object per call: callers push space ids into the arrays. */
export const emptyStillOn = (): StillOnFeatureSettings => ({
  continuousOnboardingWasEnabled: false,
  continuousOnboardingSpaceIds: [],
  scheduledDiscoveryEnabledSpaceIds: [],
});

/** Failure targets for the settings step. */
const CONTINUOUS_SETTING_TARGET_PREFIX = 'settings:continuous-onboarding@';
const SCHEDULED_SETTING_TARGET_PREFIX = 'settings:scheduled-discovery@';
const continuousSettingTarget = (spaceId: SpaceId): string =>
  `${CONTINUOUS_SETTING_TARGET_PREFIX}${spaceId}`;
const scheduledSettingTarget = (spaceId: SpaceId): string =>
  `${SCHEDULED_SETTING_TARGET_PREFIX}${spaceId}`;

/** Matches the per-space continuous onboarding documents (`<id>-<spaceId>`). */
export const isContinuousOnboardingWorkflowId = (workflowId: string): boolean =>
  workflowId.startsWith(`${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}-`);

/** The per-space continuous onboarding document of a space. */
export const continuousOnboardingWorkflowTarget = (
  spaceId: SpaceId
): MaintenanceWorkflowTarget => ({
  id: `${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}-${spaceId}`,
  spaceId,
});

export const isScheduledDiscoveryWorkflowId = (workflowId: string): boolean =>
  SCHEDULED_DISCOVERY_WORKFLOW_IDS.some(
    (baseId) => workflowId === baseId || workflowId.startsWith(`${baseId}-`)
  );

/** Whether any recorded feature setting is still waiting to be restored. */
export const hasPausedSettings = (pausedSettings: PausedFeatureSettings | undefined): boolean =>
  pausedSettings !== undefined && pausedSettings.scheduledDiscoveryEnabledSpaceIds.length > 0;

/** Whether Resume should turn this settings-backed workflow back on. */
export const shouldRestoreSettingsBackedWorkflow = (
  workflow: { id: string; spaceId: SpaceId },
  pausedSettings: (PausedFeatureSettings & Partial<StillOnFeatureSettings>) | undefined
): boolean => {
  // Resume gates a continuous document on its own setting write, so only Reset
  // (which passes the spaces whose toggle is still on) filters it here.
  if (
    isContinuousOnboardingWorkflowId(workflow.id) &&
    pausedSettings?.continuousOnboardingSpaceIds
  ) {
    return pausedSettings.continuousOnboardingSpaceIds.includes(workflow.spaceId);
  }
  if (isScheduledDiscoveryWorkflowId(workflow.id)) {
    return pausedSettings?.scheduledDiscoveryEnabledSpaceIds.includes(workflow.spaceId) === true;
  }
  // Not gated by the Settings toggles — always eligible for resume.
  return true;
};

/** Scopes a maintenance operation to a space while preserving the caller credentials. */
export const requestForSpace = (request: KibanaRequest, spaceId: SpaceId): KibanaRequest => {
  const fakeRawRequest: FakeRawRequest = {
    headers: request.headers,
    path: '/',
    spaceId,
  };
  return kibanaRequestFactory(fakeRawRequest);
};

export const createFeatureSettingsController = ({
  server,
  getScopedClients,
}: {
  server: SignificantEventsServer;
  getScopedClients: GetScopedClients;
}) => {
  /** Per-space uiSettings clients acting as the caller or as the system. */
  const getUiSettingsClients = ({
    request,
    access,
  }: {
    request: KibanaRequest;
    access: MaintenanceAccess;
  }): {
    space: (spaceId: SpaceId) => Promise<IUiSettingsClient>;
  } => {
    switch (access) {
      case 'user':
        return {
          space: async (spaceId) =>
            server.core.uiSettings.asScopedToClient(
              server.core.savedObjects.getScopedClient(requestForSpace(request, spaceId))
            ),
        };
      case 'system':
        return {
          space: async (spaceId) =>
            server.core.uiSettings.asScopedToClient(
              server.core.savedObjects.getUnsafeInternalClient().asScopedToNamespace(spaceId)
            ),
        };
      default: {
        const unhandledAccess: never = access;
        throw new Error(`Unhandled maintenance access: ${unhandledAccess}`);
      }
    }
  };

  /**
   * Turns continuous onboarding + per-space scheduled discovery settings off,
   * recording which scheduled discovery spaces were previously on. Idempotent
   * across re-pause: prior restore flags are kept when settings are already
   * false from an earlier pause.
   *
   * Also returns the continuous onboarding document of every space whose setting
   * read on. The caller records them as the restore record even when the sweep
   * could not disable them (a failed disable, a document that was already off, or
   * workflows being unavailable), since Resume restores the setting from them.
   * An unreadable setting falls back to the sweep's own record.
   */
  const pauseFeatureSettings = async ({
    request,
    access,
    spaceIds,
    previous,
    failures,
  }: {
    request: KibanaRequest;
    access: MaintenanceAccess;
    spaceIds: SpaceId[];
    previous: PausedFeatureSettings | undefined;
    failures: SignificantEventsMaintenanceFailure[];
  }): Promise<{
    pausedSettings: PausedFeatureSettings;
    continuousOnboardingTargets: MaintenanceWorkflowTarget[];
  }> => {
    const uiSettingsClients = getUiSettingsClients({ request, access });
    const next: PausedFeatureSettings = {
      continuousOnboardingWasEnabled: false,
      scheduledDiscoveryEnabledSpaceIds: [
        ...new Set(previous?.scheduledDiscoveryEnabledSpaceIds ?? []),
      ],
    };
    const continuousOnboardingTargets: MaintenanceWorkflowTarget[] = [];

    for (const spaceId of spaceIds) {
      try {
        const spaceClient = await uiSettingsClients.space(spaceId);
        try {
          if (
            await spaceClient.get<boolean>(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED)
          ) {
            // Recorded before the write, so a failed write still restores on Resume.
            continuousOnboardingTargets.push(continuousOnboardingWorkflowTarget(spaceId));
            await spaceClient.set(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED, false);
          }
        } catch (error) {
          failures.push({
            target: continuousSettingTarget(spaceId),
            spaceId,
            error: `Failed to pause continuous onboarding setting: ${toMessage(error)}`,
          });
          // Uncertain read: prefer restore on resume for this space, same as
          // the analogous scheduled-discovery read failure below.
          continuousOnboardingTargets.push(continuousOnboardingWorkflowTarget(spaceId));
        }
        let scheduledEnabled = false;
        try {
          scheduledEnabled = Boolean(
            await spaceClient.get<boolean>(
              OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
            )
          );
        } catch (error) {
          failures.push({
            target: scheduledSettingTarget(spaceId),
            spaceId,
            error: `Failed to read scheduled discovery setting: ${toMessage(error)}`,
          });
          // Uncertain read: prefer restore on resume for this space.
          if (!next.scheduledDiscoveryEnabledSpaceIds.includes(spaceId)) {
            next.scheduledDiscoveryEnabledSpaceIds.push(spaceId);
          }
        }
        if (scheduledEnabled && !next.scheduledDiscoveryEnabledSpaceIds.includes(spaceId)) {
          next.scheduledDiscoveryEnabledSpaceIds.push(spaceId);
        }
        if (scheduledEnabled || next.scheduledDiscoveryEnabledSpaceIds.includes(spaceId)) {
          try {
            await spaceClient.set(
              OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
              false
            );
          } catch (error) {
            failures.push({
              target: scheduledSettingTarget(spaceId),
              spaceId,
              error: `Failed to pause scheduled discovery setting: ${toMessage(error)}`,
            });
          }
        }
      } catch (error) {
        failures.push({
          target: scheduledSettingTarget(spaceId),
          spaceId,
          error: `Failed to pause scheduled discovery setting: ${toMessage(error)}`,
        });
      }
    }

    return { pausedSettings: next, continuousOnboardingTargets };
  };

  /**
   * Restores only the feature settings Pause recorded as previously enabled.
   * Returns the ones that could not be restored (e.g. a space the caller cannot
   * write to), so a later Resume can retry them; `undefined` when none are left.
   */
  const resumeFeatureSettings = async ({
    request,
    pausedSettings,
    failures,
  }: {
    request: KibanaRequest;
    pausedSettings: PausedFeatureSettings | undefined;
    failures: SignificantEventsMaintenanceFailure[];
  }): Promise<PausedFeatureSettings | undefined> => {
    if (!pausedSettings) {
      return undefined;
    }
    const uiSettingsClients = getUiSettingsClients({ request, access: 'user' });
    const remaining: PausedFeatureSettings = {
      continuousOnboardingWasEnabled: false,
      scheduledDiscoveryEnabledSpaceIds: [],
    };

    for (const spaceId of pausedSettings.scheduledDiscoveryEnabledSpaceIds) {
      try {
        const spaceClient = await uiSettingsClients.space(spaceId);
        await spaceClient.set(
          OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
          true
        );
      } catch (error) {
        remaining.scheduledDiscoveryEnabledSpaceIds.push(spaceId);
        failures.push({
          target: scheduledSettingTarget(spaceId),
          spaceId,
          error: `Failed to resume scheduled discovery setting: ${toMessage(error)}`,
        });
      }
    }

    return hasPausedSettings(remaining) ? remaining : undefined;
  };

  /**
   * Turns continuous onboarding back on in a space whose continuous workflow
   * document Resume re-enabled. Returns `false` when the write fails, so the
   * caller keeps the document recorded for a later Resume.
   */
  const restoreContinuousOnboarding = async ({
    request,
    spaceId,
    failures,
  }: {
    request: KibanaRequest;
    spaceId: SpaceId;
    failures: SignificantEventsMaintenanceFailure[];
  }): Promise<boolean> => {
    try {
      const spaceClient = await getUiSettingsClients({ request, access: 'user' }).space(spaceId);
      await spaceClient.set(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED, true);
      return true;
    } catch (error) {
      failures.push({
        target: continuousSettingTarget(spaceId),
        spaceId,
        error: `Failed to resume continuous onboarding setting: ${toMessage(error)}`,
      });
      return false;
    }
  };

  /** Live feature-toggle values for the caller's space (for UI sync). */
  const readFeatureSettingsStatus = async (
    request: KibanaRequest
  ): Promise<{
    continuousOnboardingEnabled: boolean;
    scheduledDiscoveryEnabled: boolean;
  }> => {
    const { uiSettingsClient } = await getScopedClients({ request });
    const [continuousOnboardingEnabled, scheduledDiscoveryEnabled] = await Promise.all([
      uiSettingsClient
        .get<boolean>(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED)
        .then(Boolean),
      uiSettingsClient
        .get<boolean>(OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED)
        .then(Boolean),
    ]);
    return { continuousOnboardingEnabled, scheduledDiscoveryEnabled };
  };

  /**
   * While paused, keep feature settings off if something turned them back on
   * (e.g. a stale client). Does not change the restore snapshot.
   */
  /** Whether a toggle currently reads on; an unreadable toggle counts as off. */
  const readsOn = async (client: Pick<IUiSettingsClient, 'get'>, key: string): Promise<boolean> => {
    try {
      return Boolean(await client.get<boolean>(key));
    } catch {
      return false;
    }
  };

  /**
   * Turn every feature toggle off. Returns the toggles that still read on after
   * a failed write, in `StillOnFeatureSettings` shape, so callers can keep the
   * matching settings-backed workflows running instead of leaving a toggle on
   * with its workflow disabled. A failed write on a toggle that was already off
   * (or cannot be read) is only recorded; keeping activity off wins.
   */
  const reassertFeatureSettingsOff = async ({
    request,
    spaceIds,
    failures,
  }: {
    request: KibanaRequest;
    spaceIds: SpaceId[];
    failures: SignificantEventsMaintenanceFailure[];
  }): Promise<StillOnFeatureSettings> => {
    const stillOn = emptyStillOn();
    // Re-assert runs without a user request (e.g. after a feature-flag flip).
    const uiSettingsClients = getUiSettingsClients({ request, access: 'system' });
    for (const spaceId of spaceIds) {
      let spaceClient: IUiSettingsClient | undefined;
      try {
        spaceClient = await uiSettingsClients.space(spaceId);
        try {
          if (
            await spaceClient.get<boolean>(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED)
          ) {
            await spaceClient.set(OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED, false);
          }
        } catch (error) {
          if (await readsOn(spaceClient, OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED)) {
            stillOn.continuousOnboardingSpaceIds.push(spaceId);
          }
          failures.push({
            target: continuousSettingTarget(spaceId),
            spaceId,
            error: `Failed to keep continuous onboarding off while paused: ${toMessage(error)}`,
          });
        }
        await spaceClient.set(
          OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
          false
        );
      } catch (error) {
        if (
          spaceClient !== undefined &&
          (await readsOn(
            spaceClient,
            OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
          ))
        ) {
          stillOn.scheduledDiscoveryEnabledSpaceIds.push(spaceId);
        }
        failures.push({
          target: scheduledSettingTarget(spaceId),
          spaceId,
          error: `Failed to keep scheduled discovery off while paused: ${toMessage(error)}`,
        });
      }
    }
    return stillOn;
  };

  /**
   * The toggles that currently read on in each space, read before Reset turns them off so an
   * aborted Reset can turn them back on. A toggle that cannot be read counts as off.
   */
  const readTogglesOn = async ({
    request,
    spaceIds,
  }: {
    request: KibanaRequest;
    spaceIds: SpaceId[];
  }): Promise<StillOnFeatureSettings> => {
    const on = emptyStillOn();
    const uiSettingsClients = getUiSettingsClients({ request, access: 'system' });
    for (const spaceId of spaceIds) {
      try {
        const spaceClient = await uiSettingsClients.space(spaceId);
        if (await readsOn(spaceClient, OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED)) {
          on.continuousOnboardingSpaceIds.push(spaceId);
        }
        if (
          await readsOn(
            spaceClient,
            OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
          )
        ) {
          on.scheduledDiscoveryEnabledSpaceIds.push(spaceId);
        }
      } catch {
        // No settings client for this space: nothing to restore there.
      }
    }
    return on;
  };

  /**
   * Turns the given toggles back on. Returns the ones that could not be written, in the same
   * shape, so the caller can keep them recorded for a later Resume.
   */
  const restoreTogglesOn = async ({
    request,
    toggles,
    failures,
  }: {
    request: KibanaRequest;
    toggles: StillOnFeatureSettings;
    failures: SignificantEventsMaintenanceFailure[];
  }): Promise<StillOnFeatureSettings> => {
    const notRestored = emptyStillOn();
    const uiSettingsClients = getUiSettingsClients({ request, access: 'system' });
    /** Turns one toggle on; returns whether the write succeeded. */
    const restore = async ({
      spaceId,
      key,
      target,
    }: {
      spaceId: SpaceId;
      key: string;
      target: string;
    }): Promise<boolean> => {
      try {
        await (await uiSettingsClients.space(spaceId)).set(key, true);
        return true;
      } catch (error) {
        failures.push({
          target,
          spaceId,
          error: `Failed to restore the setting after reset aborted: ${toMessage(error)}`,
        });
        return false;
      }
    };
    for (const spaceId of toggles.continuousOnboardingSpaceIds) {
      const restored = await restore({
        spaceId,
        key: OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
        target: continuousSettingTarget(spaceId),
      });
      if (!restored) {
        notRestored.continuousOnboardingSpaceIds.push(spaceId);
      }
    }
    for (const spaceId of toggles.scheduledDiscoveryEnabledSpaceIds) {
      const restored = await restore({
        spaceId,
        key: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        target: scheduledSettingTarget(spaceId),
      });
      if (!restored) {
        notRestored.scheduledDiscoveryEnabledSpaceIds.push(spaceId);
      }
    }
    return notRestored;
  };

  return {
    pauseFeatureSettings,
    resumeFeatureSettings,
    restoreContinuousOnboarding,
    readFeatureSettingsStatus,
    reassertFeatureSettingsOff,
    readTogglesOn,
    restoreTogglesOn,
  };
};

export type FeatureSettingsController = ReturnType<typeof createFeatureSettingsController>;
