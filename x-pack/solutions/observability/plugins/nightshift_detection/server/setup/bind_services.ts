/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Logger } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';
import { AvailabilityService } from '../lib/availability/availability_service';
import { DetectionEngineSystemClient } from '../lib/engine/es_client_tokens';
import { SpaceRunLock } from '../lib/engine/space_run_lock';
import { SpaceSetupLock } from '../lib/service_account/space_setup_lock';

/**
 * Binds the services every phase builds on. A binding that resolves lazily can sit in any
 * module; add new ones to the module test's token list.
 */
export function bindServices({ bind }: ContainerModuleLoadOptions): void {
  bind(AvailabilityService).toSelf().inSingletonScope();

  bind(DetectionEngineSystemClient)
    .toResolvedValue(
      (elasticsearch) => elasticsearch.client.asInternalUser,
      [CoreStart('elasticsearch')]
    )
    .inSingletonScope();

  // The run lock lives in the shared `.kibana_locks` index, written as kibana_system.
  bind(SpaceRunLock)
    .toResolvedValue(
      (esClient, logger) => new SpaceRunLock(esClient, logger.get('run-lock')),
      [DetectionEngineSystemClient, Logger]
    )
    .inSingletonScope();

  // The setup lock shares that index, so one `_enable` per space runs at a time.
  bind(SpaceSetupLock)
    .toResolvedValue(
      (esClient, logger) => new SpaceSetupLock(esClient, logger.get('setup-lock')),
      [DetectionEngineSystemClient, Logger]
    )
    .inSingletonScope();
}
