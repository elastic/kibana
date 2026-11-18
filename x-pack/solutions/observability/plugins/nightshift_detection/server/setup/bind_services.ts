/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { CoreStart } from '@kbn/core-di-server';
import { AvailabilityService } from '../lib/availability/availability_service';
import { DetectionEngineSystemClient } from '../lib/engine/es_client_tokens';

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
}
