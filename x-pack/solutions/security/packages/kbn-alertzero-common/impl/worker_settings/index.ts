/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { WatchAutonomyLevel, WorkerSettings } from '../schemas';
import { buildCompleteWorkerSettingsSchema, buildDefaultWorkerSettings } from './contract';
import { RULE_CREATION_SETTINGS, RULE_TUNING_SETTINGS } from './detection_watch';
import { ALERT_TRIAGE_SETTINGS, ATTACK_DISCOVERY_SETTINGS } from './floor_watch';
import { CONTINUOUS_THREAT_HUNT_SETTINGS } from './hunt_watch';
import type { WorkerSettingsDeclaration } from './types';

/** Every registered Worker declares its settings here; each Watch team owns its own file. */
export const WORKER_SETTINGS_DECLARATIONS: readonly WorkerSettingsDeclaration[] = [
  ALERT_TRIAGE_SETTINGS,
  ATTACK_DISCOVERY_SETTINGS,
  CONTINUOUS_THREAT_HUNT_SETTINGS,
  RULE_TUNING_SETTINGS,
  RULE_CREATION_SETTINGS,
];

interface WorkerSettingsContract {
  declaration: WorkerSettingsDeclaration;
  schema: z.ZodType<WorkerSettings>;
  defaults: WorkerSettings;
}

const contractsByWorkerId = new Map<string, WorkerSettingsContract>(
  WORKER_SETTINGS_DECLARATIONS.map((declaration) => [
    declaration.workerId,
    {
      declaration,
      schema: buildCompleteWorkerSettingsSchema(declaration),
      defaults: buildDefaultWorkerSettings(declaration),
    },
  ])
);

const getContract = (workerId: string): WorkerSettingsContract => {
  const contract = contractsByWorkerId.get(workerId);
  if (!contract) {
    throw new Error(`Worker "${workerId}" has no settings declaration`);
  }
  return contract;
};

export const getWorkerSettingsDeclaration = (workerId: string): WorkerSettingsDeclaration =>
  getContract(workerId).declaration;

export const getCompleteWorkerSettingsSchema = (workerId: string): z.ZodType<WorkerSettings> =>
  getContract(workerId).schema;

export const createDefaultWorkerSettings = (workerId: string): WorkerSettings =>
  getContract(workerId).defaults;

export const getAllowedAutonomyLevels = (workerId: string): readonly WatchAutonomyLevel[] =>
  getContract(workerId).declaration.allowedAutonomyLevels;

export {
  applyWorkerSettingsWrite,
  diffWorkerSettings,
  formatWorkerSettingsIssues,
  projectStoredAutonomyLevel,
  touchesWorkerSettings,
} from './contract';
export {
  ANALYSIS_WINDOW_DAYS_DEFAULT,
  ANALYSIS_WINDOW_DAYS_MAX,
  ANALYSIS_WINDOW_DAYS_MIN,
  RULE_TUNING_DEFAULT_EXTRAS,
} from './detection_watch';
export { ALERT_TRIAGE_DEFAULT_EXTRAS } from './floor_watch';
export type { WorkerSettingsDeclaration } from './types';
