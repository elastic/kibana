/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SYSTEM_SECURITY_WORKER_IDS } from '@kbn/pnd-common';
import { SYSTEM_SECURITY_WORKER_CATALOG } from '@kbn/pnd-common';
import { createWorkerSettingsRegistration } from './worker_settings';
import type { WorkerSettingsRegistration } from './types';

type RegisteredWorkerId = (typeof SYSTEM_SECURITY_WORKER_IDS)[number];

export const workerSettingsById: Record<RegisteredWorkerId, WorkerSettingsRegistration> =
  Object.fromEntries(
    SYSTEM_SECURITY_WORKER_CATALOG.map(({ id }) => [id, createWorkerSettingsRegistration(id)])
  ) as Record<RegisteredWorkerId, WorkerSettingsRegistration>;

export { createWorkerSettingsRegistration } from './worker_settings';
export type { WorkerSettingsPatch, WorkerSettingsRegistration } from './types';
