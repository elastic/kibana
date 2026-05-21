/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject, type Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { HttpStart, IToasts, Toast } from '@kbn/core/public';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  DuplicateDetectionsToastBody,
  type DuplicateDetectionEvent,
} from './duplicate_detections_toast';
import { DuplicateDetectionsFlyout } from './duplicate_detections_flyout';
import { getDetectorSettingsStore, type DetectorSettings } from './duplicate_detections_settings';
import { getPluginOwnersStore } from './duplicate_detections_owners';
import { DuplicateDetectionsToolbarButton } from './duplicate_detections_toolbar_button';

/**
 * Subset of the `developerToolbar` plugin contract we actually use. We import
 * the type rather than the plugin itself to keep `observability_shared` from
 * taking a hard plugin dependency – the registry shape is identical between
 * `DeveloperToolbarSetup` and `DeveloperToolbarStart`.
 */
export interface DeveloperToolbarRegistry {
  registerItem: (item: { id: string; children: React.ReactNode; priority?: number }) => () => void;
}

const TOOLBAR_ITEM_ID = 'Duplicate request detector';

/** Cap the in-memory ring buffer to avoid unbounded growth on pathological pages. */
const MAX_EVENTS = 50;

/**
 * Singleton that owns the **single** consolidated "duplicate network requests"
 * toast shown to plugin developers. Every detector instance (SLO, Synthetics, …)
 * funnels its detections through `record()`. The first record creates one toast
 * whose body is a React `MountPoint` subscribed to a `BehaviorSubject`; subsequent
 * records just push into the subject so the component re-renders in place – no
 * new toasts are created.
 *
 * **Toast vs. events lifecycle:** the toast is a transient notification – it can
 * auto-dismiss (after `toastLifeTimeMs`) or the user can close it. That is
 * independent of the events ring buffer, which lives until either the user
 * explicitly clears it via the flyout's "Clear all" button, the ring buffer is
 * evicted (`MAX_EVENTS`), or the detector is torn down. This way, opening the
 * flyout and then having the toast quietly expire doesn't suddenly wipe the
 * data the user is inspecting. When the toast disappears we simply forget the
 * reference so that the next detection re-pops a fresh toast.
 */
class DuplicateDetectionsManager {
  private events: DuplicateDetectionEvent[] = [];
  private readonly events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([]);
  private activeToast: Toast | null = null;
  private activeFlyout: OverlayRef | null = null;
  private toasts: IToasts | null = null;
  private overlays: OverlayStart | null = null;
  private rendering: RenderingService | null = null;
  private http: HttpStart | null = null;
  private toastLifeTimeMs = 60_000;
  private toastsSubscription: Subscription | null = null;
  private unregisterToolbarItem: (() => void) | null = null;

  /**
   * Idempotent. Wires the singleton up to the first
   * `(toasts, overlays, rendering)` triple it sees; later calls (e.g. from a
   * second plugin) are no-ops, since both plugins inevitably share the same
   * Kibana shell instance.
   */
  configure(
    toasts: IToasts,
    overlays: OverlayStart,
    rendering: RenderingService,
    toastLifeTimeMs: number,
    http?: HttpStart
  ): void {
    if (this.toasts) return;
    this.toasts = toasts;
    this.overlays = overlays;
    this.rendering = rendering;
    this.http = http ?? null;
    this.toastLifeTimeMs = toastLifeTimeMs;
    // Only watches the toast handle so we can re-pop on the next detection –
    // it intentionally does NOT clear `events`, otherwise an auto-dismiss
    // would wipe the data while the flyout is still open.
    this.toastsSubscription = toasts.get$().subscribe((list) => {
      if (this.activeToast && !list.some((t) => t.id === this.activeToast!.id)) {
        this.activeToast = null;
      }
    });
  }

  /**
   * Push a detection event into the consolidated view. Creates the toast on
   * first call; subsequent calls just update the in-place React subscription.
   * While the deep-dive flyout is open we skip popping a toast – the same
   * data is already visible (and live-updating) in the flyout table.
   */
  record(event: DuplicateDetectionEvent): void {
    if (!this.toasts || !this.rendering) return;
    this.events = [event, ...this.events].slice(0, MAX_EVENTS);
    this.events$.next(this.events);
    if (this.activeFlyout) return;
    if (this.activeToast) return;
    this.activeToast = this.toasts.addWarning({
      title: i18n.translate('xpack.observabilityShared.duplicateRequestDetector.toastTitle', {
        defaultMessage: 'Duplicate network requests detected',
      }),
      text: toMountPoint(
        React.createElement(DuplicateDetectionsToastBody, {
          events$: this.events$,
          onShowDetails: (anchorDetectedAt) => this.openDetailsFlyout(anchorDetectedAt),
          onPause: () => this.pauseDetection(),
          onOpenSettings: () => this.openDetailsFlyout(undefined, 'settings'),
        }),
        this.rendering
      ),
      toastLifeTimeMs: this.toastLifeTimeMs,
      iconType: 'warning',
    });
  }

  /**
   * Open the deep-dive flyout. If a flyout is already open, brings it to focus
   * (no-op) instead of stacking. `initialAnchorDetectedAt` lets the toast
   * deep-link the user to the detection they were inspecting; `initialTab`
   * lets the toast's gear icon deep-link straight to the Settings tab.
   */
  openDetailsFlyout(
    initialAnchorDetectedAt?: number,
    initialTab: 'detections' | 'settings' = 'detections'
  ): void {
    if (!this.overlays || !this.rendering) return;
    if (this.activeFlyout) return;
    // The flyout shows everything the toast shows (and more), so dismiss the
    // toast to avoid duplicate visuals stacking on top of each other.
    if (this.toasts && this.activeToast) {
      this.toasts.remove(this.activeToast);
      this.activeToast = null;
    }
    const settingsStore = getDetectorSettingsStore();
    const ownersStore = getPluginOwnersStore();
    const http = this.http;
    const flyoutRef = this.overlays.openFlyout(
      toMountPoint(
        React.createElement(DuplicateDetectionsFlyout, {
          events$: this.events$,
          settings$: settingsStore.settings$,
          ownersSnapshot$: ownersStore.snapshot$,
          initialAnchorDetectedAt,
          initialTab,
          onClearAll: () => this.clearAll(),
          onClose: () => flyoutRef.close(),
          onUpdateSettings: (patch: Partial<DetectorSettings>) => settingsStore.update(patch),
          onResetSettings: () => settingsStore.reset(),
          onExcludePath: (pathPrefix: string) => this.excludePath(pathPrefix),
          // Only expose the detect button when the manager has an http handle —
          // without it, the fetch can't be made, so hiding it is cleaner than
          // showing a button that silently does nothing.
          onDetectMyTeams: http ? () => ownersStore.detectMyTeams(http) : undefined,
        }),
        this.rendering
      ),
      {
        size: 'm',
        maxWidth: 720,
        ownFocus: true,
        outsideClickCloses: true,
        'aria-labelledby': 'duplicateDetectionsFlyoutTitle',
        onClose: (flyout) => {
          this.activeFlyout = null;
          flyout.close();
        },
      }
    );
    this.activeFlyout = flyoutRef;
  }

  /**
   * Register a single entry in the Kibana developer toolbar (bottom chrome
   * footer). Idempotent — the first call wins, all subsequent calls are
   * no-ops. This is important because every plugin that boots the detector
   * (SLO, Synthetics, …) will try to register their own copy; we only want
   * one icon. The registry on the toolbar plugin de-dupes by `id` too, but
   * doing it here avoids the redundant React subtree.
   *
   * The button is always visible while the detector is running (even when
   * paused, even when no detections yet) so it doubles as the discoverable
   * "re-enable detection" entry point after a Pause.
   */
  registerToolbarItem(developerToolbar: DeveloperToolbarRegistry): void {
    if (this.unregisterToolbarItem) return;
    const settingsStore = getDetectorSettingsStore();
    this.unregisterToolbarItem = developerToolbar.registerItem({
      id: TOOLBAR_ITEM_ID,
      priority: 10,
      children: React.createElement(DuplicateDetectionsToolbarButton, {
        events$: this.events$,
        settings$: settingsStore.settings$,
        onOpenFlyout: () => this.openDetailsFlyout(),
      }),
    });
  }

  /**
   * Flip the global "enabled" setting to `false` and dismiss the active toast.
   * Used by the toast's Pause icon button as a one-click way to silence the
   * detector without having to open the flyout's Settings tab. The user can
   * re-enable from Settings; existing accumulated events are preserved.
   */
  pauseDetection(): void {
    getDetectorSettingsStore().update({ enabled: false });
    if (this.toasts && this.activeToast) {
      this.toasts.remove(this.activeToast);
      this.activeToast = null;
    }
  }

  /**
   * Drop all accumulated detections and dismiss the toast. The interceptor
   * stays attached so future detections start a fresh session.
   */
  clearAll(): void {
    if (this.toasts && this.activeToast) {
      this.toasts.remove(this.activeToast);
    }
    this.activeToast = null;
    this.events = [];
    this.events$.next([]);
  }

  /**
   * Add a path prefix to the user-defined exclusions **and** purge any
   * already-recorded events whose path starts with that prefix. Used by the
   * flyout's per-row "Mute endpoint" action.
   */
  excludePath(pathPrefix: string): void {
    if (!pathPrefix) return;
    const store = getDetectorSettingsStore();
    const current = store.get();
    if (!current.ignoredPathPrefixes.includes(pathPrefix)) {
      store.update({
        ignoredPathPrefixes: [...current.ignoredPathPrefixes, pathPrefix],
      });
    }
    const before = this.events.length;
    this.events = this.events.filter((e) => !e.path.split('?')[0].startsWith(pathPrefix));
    if (this.events.length !== before) {
      this.events$.next(this.events);
    }
  }

  /**
   * Tear down the singleton. Used by tests; production callers don't need this
   * because the dev-mode interceptor lives for the lifetime of the tab.
   */
  reset(): void {
    if (this.activeFlyout) {
      this.activeFlyout.close();
      this.activeFlyout = null;
    }
    if (this.toasts && this.activeToast) {
      this.toasts.remove(this.activeToast);
    }
    this.toastsSubscription?.unsubscribe();
    this.toastsSubscription = null;
    this.activeToast = null;
    this.toasts = null;
    this.overlays = null;
    this.rendering = null;
    this.http = null;
    if (this.unregisterToolbarItem) {
      this.unregisterToolbarItem();
      this.unregisterToolbarItem = null;
    }
    this.events = [];
    this.events$.next([]);
  }

  /** Test helper – exposes whether the toolbar item is currently registered. */
  __isToolbarItemRegisteredForTests(): boolean {
    return this.unregisterToolbarItem !== null;
  }

  /** Test helper – exposes the current event list without going through the toast. */
  __getEventsForTests(): readonly DuplicateDetectionEvent[] {
    return this.events;
  }

  /** Test helper – exposes the active toast reference. */
  __getActiveToastForTests(): Toast | null {
    return this.activeToast;
  }

  /** Test helper – exposes whether the flyout is currently open. */
  __isFlyoutOpenForTests(): boolean {
    return this.activeFlyout !== null;
  }
}

/**
 * Cross-bundle-safe singleton. Kibana plugins are loaded as separate bundles,
 * so we deliberately stash the manager on `globalThis` under a `Symbol.for`
 * key to ensure one instance per browser tab even if the module is somehow
 * evaluated twice.
 */
const SINGLETON_KEY: unique symbol = Symbol.for(
  'kbn.observabilityShared.duplicateDetectionsManager'
);

interface GlobalWithManager {
  [SINGLETON_KEY]?: DuplicateDetectionsManager;
}

export const getDuplicateDetectionsManager = (): DuplicateDetectionsManager => {
  const g = globalThis as unknown as GlobalWithManager;
  if (!g[SINGLETON_KEY]) {
    g[SINGLETON_KEY] = new DuplicateDetectionsManager();
  }
  return g[SINGLETON_KEY]!;
};

/** Test-only: drop the singleton so the next `get` returns a fresh instance. */
export const __resetDuplicateDetectionsManagerForTests = (): void => {
  const g = globalThis as unknown as GlobalWithManager;
  g[SINGLETON_KEY]?.reset();
  delete g[SINGLETON_KEY];
};

export type { DuplicateDetectionEvent };
