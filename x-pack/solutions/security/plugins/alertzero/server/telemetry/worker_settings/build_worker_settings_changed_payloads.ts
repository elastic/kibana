/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { diffWorkerSettings, type WorkerSettings } from '@kbn/alertzero-common';
import type {
  AlertZeroAutonomyLevel,
  AlertZeroScheduleIntervalBucket,
  AlertZeroWorkerEnabledValue,
  AlertZeroWorkerSetting,
} from '../constants';
import type { AlertZeroWorkerSettingsChangedPayload } from '../event_types';
import { resolveWorkerCatalogFields } from '../envelope/resolve_worker_catalog_fields';
import { bucketScheduleInterval } from './bucket_schedule_interval';
import { resolveWorkerSetting } from './resolve_worker_setting';

export interface BuildWorkerSettingsChangedPayloadsParams {
  /** The installed Worker's enabled state before and after the write; absent when it set none. */
  enabled?: {
    next: boolean;
    previous: boolean;
  };
  /** Absent when the write saved no settings. */
  settings?: {
    /** The settings as persisted by the write. */
    next: WorkerSettings;
    /** The settings the write replaced: the stored settings, or the defaults on a first save. */
    previous: WorkerSettings;
  };
  /**
   * The revision the settings write was accepted against; null when the write saved no settings,
   * or the Worker had no document.
   */
  settingsRevision: number | null;
  spaceId: string;
  workerId: string;
}

type SettingValue =
  | AlertZeroAutonomyLevel
  | AlertZeroScheduleIntervalBucket
  | AlertZeroWorkerEnabledValue;

interface SettingChange {
  nextValue?: SettingValue;
  previousValue?: SettingValue;
  setting: AlertZeroWorkerSetting;
}

/** Only enums and bounded values ship; `extras`, `service_account` and `other` report the change alone. */
const toReportedValue = (
  setting: AlertZeroWorkerSetting,
  settings: WorkerSettings
): SettingValue | undefined => {
  if (setting === 'autonomy') {
    return settings.autonomy;
  }
  if (setting === 'schedule_interval' && settings.scheduleInterval !== undefined) {
    return bucketScheduleInterval(settings.scheduleInterval);
  }
  return undefined;
};

const toEnabledValue = (enabled: boolean): AlertZeroWorkerEnabledValue =>
  enabled ? 'true' : 'false';

const getSettingsChanges = (
  settings: BuildWorkerSettingsChangedPayloadsParams['settings']
): SettingChange[] =>
  settings === undefined
    ? []
    : Object.keys(diffWorkerSettings(settings.previous, settings.next) ?? {})
        .map(resolveWorkerSetting)
        .map((setting) => ({
          nextValue: toReportedValue(setting, settings.next),
          previousValue: toReportedValue(setting, settings.previous),
          setting,
        }));

const getEnabledChanges = (
  enabled: BuildWorkerSettingsChangedPayloadsParams['enabled']
): SettingChange[] =>
  enabled === undefined || enabled.next === enabled.previous
    ? []
    : [
        {
          nextValue: toEnabledValue(enabled.next),
          previousValue: toEnabledValue(enabled.previous),
          setting: 'enabled',
        },
      ];

/**
 * Builds one `alertzero_worker_settings_changed` payload per setting a write changed, counting an
 * enable or disable of an installed Worker as the `enabled` setting.
 */
export const buildWorkerSettingsChangedPayloads = ({
  enabled,
  settings,
  settingsRevision,
  spaceId,
  workerId,
}: BuildWorkerSettingsChangedPayloadsParams): AlertZeroWorkerSettingsChangedPayload[] => {
  const changes = [...getSettingsChanges(settings), ...getEnabledChanges(enabled)];

  return changes.map(({ nextValue, previousValue, setting }) => ({
    ...resolveWorkerCatalogFields(workerId),
    bulk_write: changes.length > 1,
    is_default_space: spaceId === DEFAULT_SPACE_ID,
    ...(nextValue === undefined ? {} : { next_value: nextValue }),
    ...(previousValue === undefined ? {} : { previous_value: previousValue }),
    setting,
    ...(settingsRevision === null ? {} : { settings_revision: settingsRevision }),
  }));
};
