/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID } from '@kbn/alertzero-common';
import { AttackDiscoverySettingsExtras } from './attack_discovery';
import type { WorkerSettingsExtrasComponent } from './types';

/**
 * Per-Worker extras slot. The common settings card looks up by id and renders nothing when
 * absent — unique UX lives here, unique-but-shared widgets stay on the card (presence-driven).
 */
export const workerSettingsExtrasById: Partial<Record<string, WorkerSettingsExtrasComponent>> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: AttackDiscoverySettingsExtras,
};

export type { WorkerSettingsExtrasComponent, WorkerSettingsExtrasProps } from './types';
