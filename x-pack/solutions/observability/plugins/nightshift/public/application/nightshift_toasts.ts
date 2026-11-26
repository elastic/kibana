/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ErrorToastOptions,
  IUiSettingsClient,
  Toast,
  ToastInput,
  ToastOptions,
  ToastsStart,
} from '@kbn/core/public';

type ToastKind = 'info' | 'warning' | 'error';

/**
 * Longest a Nightshift toast stays on screen. Core's defaults (5s for info, 10s for warning, 5min
 * for error) leave toasts covering the bottom-right action buttons, like onboarding's Proceed.
 */
const MAX_LIFETIME_MS: Record<ToastKind, number> = {
  info: 4000,
  warning: 8000,
  error: 15000,
};

const LIFETIME_SETTING: Record<ToastKind, string> = {
  info: 'notifications:lifetime:info',
  warning: 'notifications:lifetime:warning',
  error: 'notifications:lifetime:error',
};

export interface NightshiftToasts extends ToastsStart {
  /** Removes the toasts added through this instance that are still on screen. */
  dismissAll: () => void;
}

/**
 * Wraps Core's toasts so Nightshift toasts are short-lived and don't outlive the app. A smaller
 * lifetime, from the caller or the `notifications:lifetime:*` advanced settings, still wins.
 */
export const createNightshiftToasts = (
  toasts: ToastsStart,
  uiSettings: IUiSettingsClient
): NightshiftToasts => {
  const added = new Map<string, Toast>();

  const track = (toast: Toast): Toast => {
    added.set(toast.id, toast);
    return toast;
  };

  const getLifetime = (kind: ToastKind, requestedMs?: number): number => {
    // The advanced settings can be the string 'Infinity', which `Number` turns into `Infinity`.
    const lifetimeMs = Number(requestedMs ?? uiSettings.get(LIFETIME_SETTING[kind]));
    return Number.isNaN(lifetimeMs)
      ? MAX_LIFETIME_MS[kind]
      : Math.min(lifetimeMs, MAX_LIFETIME_MS[kind]);
  };

  const getInputLifetime = (toastOrTitle: ToastInput): number | undefined =>
    typeof toastOrTitle === 'string' ? undefined : toastOrTitle.toastLifeTimeMs;

  const withLifetime = (
    kind: ToastKind,
    toastOrTitle: ToastInput,
    options?: ToastOptions
  ): ToastOptions => ({
    ...options,
    toastLifeTimeMs: getLifetime(kind, options?.toastLifeTimeMs ?? getInputLifetime(toastOrTitle)),
  });

  return {
    get$: () => toasts.get$(),
    remove: (toastOrId) => {
      const id = typeof toastOrId === 'string' ? toastOrId : toastOrId.id;
      added.delete(id);
      toasts.remove(toastOrId);
    },
    // Core's `add` falls back to the info lifetime.
    add: (toastOrTitle) =>
      track(
        toasts.add({
          ...(typeof toastOrTitle === 'string' ? { title: toastOrTitle } : toastOrTitle),
          toastLifeTimeMs: getLifetime('info', getInputLifetime(toastOrTitle)),
        })
      ),
    addInfo: (toastOrTitle, options) =>
      track(toasts.addInfo(toastOrTitle, withLifetime('info', toastOrTitle, options))),
    addSuccess: (toastOrTitle, options) =>
      track(toasts.addSuccess(toastOrTitle, withLifetime('info', toastOrTitle, options))),
    addWarning: (toastOrTitle, options) =>
      track(toasts.addWarning(toastOrTitle, withLifetime('warning', toastOrTitle, options))),
    addDanger: (toastOrTitle, options) =>
      track(toasts.addDanger(toastOrTitle, withLifetime('warning', toastOrTitle, options))),
    addError: (error: Error, options: ErrorToastOptions) =>
      track(
        toasts.addError(error, {
          ...options,
          toastLifeTimeMs: getLifetime('error', options.toastLifeTimeMs),
        })
      ),
    dismissAll: () => {
      added.forEach((toast) => toasts.remove(toast));
      added.clear();
    },
  };
};
