/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WORKER_CATALOG,
  getWorkerCustomSettingFields,
} from '@kbn/alertzero-common';
import { DetectionWatchSettings } from './detection_watch_settings';
import type { WatchCustomSettingsComponent } from './types';

export const WATCH_CUSTOM_SETTINGS_COMPONENTS: Partial<
  Record<string, WatchCustomSettingsComponent>
> = {
  [SYSTEM_SECURITY_WATCH_DETECTION_ID]: DetectionWatchSettings,
};

export const getWatchCustomSettingsComponent = (
  watchId: string
): WatchCustomSettingsComponent | undefined => WATCH_CUSTOM_SETTINGS_COMPONENTS[watchId];

/**
 * Fails AlertZero application loading when a Worker declares custom fields that no Watch-owned
 * component covers. Shared-only Workers need no component. This is a browser-load check, not a
 * Kibana server-startup failure.
 */
export const assertWatchCustomSettingsComplete = (): void => {
  const missing: string[] = [];

  for (const worker of SYSTEM_SECURITY_WORKER_CATALOG) {
    const required = getWorkerCustomSettingFields(worker.id);
    if (required.length === 0) {
      continue;
    }

    const component = WATCH_CUSTOM_SETTINGS_COMPONENTS[worker.watchId];
    const covered = component?.coveredFields[worker.id] ?? [];
    const uncovered = required.filter((field) => !covered.includes(field));
    if (!component || uncovered.length > 0) {
      missing.push(
        `${worker.id} (${uncovered.join(', ') || required.join(', ')}) on watch ${worker.watchId}`
      );
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `AlertZero Watch settings are incomplete; declared custom fields have no control: ${missing.join(
        '; '
      )}`
    );
  }
};
