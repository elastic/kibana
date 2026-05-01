/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { type ActionButton, ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { ConfigKey } from '../../../common/runtime_types';
import type { MonitorAttachmentData } from '../../../common/agent_builder';
import {
  createMonitor,
  getMonitorDetailsUrl,
  updateMonitor,
  type MonitorLocationWarning,
} from './monitor_management_actions';
import { inferMonitorStatus, type MonitorAgentStatus } from './monitor_management_status';

export interface MonitorCanvasSaveState {
  /** True while a Create / Update is in flight. */
  isSaving: boolean;
  /** Last persistence error. Cleared when a new save attempt starts. */
  saveError: Error | null;
  /** Per-location warnings from the most recent save (partial-failure path). */
  locationWarnings: MonitorLocationWarning[];
}

export interface UseMonitorCanvasActionsParams {
  /** Current attachment data. Reactive — re-running ops update this. */
  monitor: MonitorAttachmentData;
  /** Synthetics save capability flag (`capabilities.uptime.save`). */
  canEdit: boolean;
  /**
   * `capabilities.uptime.elasticManagedLocationsEnabled` — relevant only
   * when the draft uses Elastic-managed locations. Default `true` when
   * the capability is undefined (matches `useCanUsePublicLocations`).
   */
  canUseElasticManaged: boolean;
  /** Browser HTTP client. */
  http: HttpStart;
  /** Application contract for navigation + capability lookup. */
  application: ApplicationStart;
  /**
   * Framework-provided callback. After a successful create, we call this
   * with the new saved-object id so the attachment transitions from
   * by-value (proposed) to by-reference (saved).
   */
  updateOrigin: (origin: string) => Promise<unknown>;
  /** Framework-provided callback. Closes the canvas flyout. */
  closeCanvas: () => void;
  /**
   * State setter passed by the canvas body. The hook drives the body's
   * spinner / error callout via this single state object.
   */
  setSaveState: (next: MonitorCanvasSaveState) => void;
}

const writeDisabledReason = (
  canEdit: boolean,
  canUseElasticManaged: boolean
): string | undefined => {
  if (!canEdit) {
    return i18n.translate(
      'xpack.synthetics.agentBuilder.monitor.canvas.disabledReason.missingPrivilege',
      {
        defaultMessage:
          'You don\u2019t have permission to save synthetics monitors. Contact your administrator to grant the Uptime "Save" privilege.',
      }
    );
  }
  if (!canUseElasticManaged) {
    return i18n.translate(
      'xpack.synthetics.agentBuilder.monitor.canvas.disabledReason.elasticManagedDisabled',
      {
        defaultMessage:
          'Elastic-managed locations are disabled for your role. Re-create the monitor on a private location, or ask an administrator to enable Elastic-managed locations.',
      }
    );
  }
  return undefined;
};

/**
 * Returns the Create / Update / View action buttons for the current
 * monitor attachment, based on its lifecycle status and the user's
 * Synthetics capabilities.
 *
 * Status-based wiring:
 *
 * | Status        | Buttons                                  |
 * | ------------- | ---------------------------------------- |
 * | `proposed`    | **Create** (primary)                     |
 * | `enabled`     | **Update** (primary), **View** (secondary) |
 * | `disabled`    | **Update** (primary), **View** (secondary) |
 * | `cli-managed` | **View** (primary, navigates to the synthetics monitor details page) |
 *
 * ---
 *
 * **In-body rendering, not framework-header (T7 hot-fix #4):** earlier
 * iterations registered these buttons on the canvas flyout's header
 * via the framework's `registerActionButtons` callback (mirroring
 * `dashboard_agent`'s `useRegisterCanvasActionButtons`). Manual
 * testing surfaced two issues with that placement:
 *
 * - The framework header packs Create + close + the by-reference
 *   "Preview Only" lock badge into a thin strip; primary CTAs are
 *   visually crowded and hard to discover.
 * - The framework's `CanvasFlyout` clears `dynamicButtons` on attachment
 *   change in a parent `useEffect`, racing our child registration. We
 *   worked around it once with a `queueMicrotask` defer, but that's
 *   fragile and the platform-level race itself is still tracked as
 *   followup F10.
 *
 * Returning the button descriptors and rendering them as proper
 * `EuiButton`s in the canvas body footer side-steps both problems and
 * matches the "card with a primary CTA at the bottom" pattern users
 * already know from the Synthetics SPA save flow. The button shape
 * (label / icon / type / disabled / disabledReason / handler) is the
 * same `ActionButton` contract the framework uses, so we don't pay a
 * naming or refactor cost if a future iteration moves them back.
 *
 * The returned reference is stable per render — `useMemo`'d on the
 * inputs the buttons close over. Handlers internally drive the
 * `setSaveState` callback so the body can render the spinner / error
 * callout / location-warnings callout.
 */
export const useMonitorCanvasActions = ({
  monitor,
  canEdit,
  canUseElasticManaged,
  http,
  application,
  updateOrigin,
  closeCanvas,
  setSaveState,
}: UseMonitorCanvasActionsParams): ActionButton[] => {
  return useMemo<ActionButton[]>(() => {
    const status: MonitorAgentStatus = inferMonitorStatus(monitor);
    const configId = monitor[ConfigKey.CONFIG_ID];
    const disabledReason = writeDisabledReason(canEdit, canUseElasticManaged);
    const writeDisabled = disabledReason !== undefined;

    const navigateToMonitor = async () => {
      if (!configId) return;
      const appPath = application.getUrlForApp('synthetics');
      await application.navigateToUrl(getMonitorDetailsUrl(configId, appPath));
      closeCanvas();
    };

    const runSave = async (mode: 'create' | 'update') => {
      setSaveState({ isSaving: true, saveError: null, locationWarnings: [] });
      try {
        const outcome =
          mode === 'create'
            ? await createMonitor(http, monitor)
            : await updateMonitor(http, configId!, monitor);

        if (mode === 'create') {
          await updateOrigin(outcome.id);
        }

        setSaveState({
          isSaving: false,
          saveError: null,
          locationWarnings: outcome.locationWarnings,
        });

        // Only auto-close on a fully clean save. Partial-failure
        // (location warnings present) keeps the canvas open so the
        // user can read the callout.
        if (outcome.locationWarnings.length === 0) {
          closeCanvas();
        }
      } catch (error) {
        setSaveState({
          isSaving: false,
          saveError: error instanceof Error ? error : new Error(String(error)),
          locationWarnings: [],
        });
      }
    };

    const buttons: ActionButton[] = [];

    if (status === 'cli-managed') {
      buttons.push({
        label: i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.actions.viewLabel', {
          defaultMessage: 'View in Synthetics',
        }),
        icon: 'popout',
        type: ActionButtonType.PRIMARY,
        disabled: !configId,
        handler: navigateToMonitor,
      });
    } else if (status === 'proposed') {
      buttons.push({
        label: i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.actions.createLabel', {
          defaultMessage: 'Create',
        }),
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        disabled: writeDisabled,
        disabledReason,
        handler: () => runSave('create'),
      });
    } else {
      buttons.push({
        label: i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.actions.updateLabel', {
          defaultMessage: 'Update',
        }),
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        disabled: writeDisabled || !configId,
        disabledReason,
        handler: () => runSave('update'),
      });
      buttons.push({
        label: i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.actions.viewLabel', {
          defaultMessage: 'View in Synthetics',
        }),
        icon: 'popout',
        type: ActionButtonType.SECONDARY,
        disabled: !configId,
        handler: navigateToMonitor,
      });
    }

    return buttons;
  }, [
    monitor,
    canEdit,
    canUseElasticManaged,
    http,
    application,
    updateOrigin,
    closeCanvas,
    setSaveState,
  ]);
};
