/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  getWorkerCustomSettingFields,
} from '../constants';
import type { WorkerSettings, WorkerSettingsWrite } from './schemas';
import {
  RuleTuningWorkerSettings,
  ScheduledWorkerSettings,
  SharedOnlyWorkerSettings,
} from './schemas';

const SCHEDULED_WORKER_IDS = new Set<string>([
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
]);

export const workerOwnsSchedule = (workerId: string): boolean => SCHEDULED_WORKER_IDS.has(workerId);

export const getCompleteWorkerSettingsSchema = (workerId: string) => {
  if (workerId === SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID) {
    return RuleTuningWorkerSettings;
  }
  if (workerOwnsSchedule(workerId)) {
    return ScheduledWorkerSettings;
  }
  return SharedOnlyWorkerSettings;
};

export const parseCompleteWorkerSettings = (settings: WorkerSettings): WorkerSettings =>
  getCompleteWorkerSettingsSchema(settings.workerId).parse(settings);

const WRONG_WORKER_REJECTIONS: Record<string, string> = {
  scheduleInterval: 'a schedule interval',
  analysisWindowDays: 'an analysis window',
};

export const rejectUnsupportedWorkerSettingsWrite = (
  workerId: string,
  settings: WorkerSettingsWrite
): string | undefined => {
  if (settings.scheduleInterval != null && !workerOwnsSchedule(workerId)) {
    return WRONG_WORKER_REJECTIONS.scheduleInterval;
  }
  if (
    settings.analysisWindowDays != null &&
    !getWorkerCustomSettingFields(workerId).includes('analysisWindowDays')
  ) {
    return WRONG_WORKER_REJECTIONS.analysisWindowDays;
  }
  return undefined;
};

export const touchesWorkerSettings = (patch: {
  settings?: WorkerSettingsWrite | undefined;
}): boolean => patch.settings != null;
