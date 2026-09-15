/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID } from '@kbn/alertzero-common';
import { attackDiscoveryExtras } from './attack_discovery';
import type { WorkerExtrasModule } from './types';

/**
 * Per-Worker unique-settings modules. Presence in this map is the extras opt-in — the common
 * factory never lists unique field names.
 */
export const workerExtrasById: Partial<Record<string, WorkerExtrasModule>> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: attackDiscoveryExtras,
};

export { isPlainObject } from './types';
export type { WorkerExtrasModule } from './types';
