/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnSetup } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-server';
import { DetectionStateClient, DetectionStateService } from '../lib/state';

/**
 * Runs the state service's two phases: setup registers the saved object type, and the client is
 * the product of its start, resolved once Core has started.
 */
export function bindState({ bind }: ContainerModuleLoadOptions): void {
  bind(DetectionStateService).toSelf().inSingletonScope();

  bind(OnSetup).toResolvedValue(
    (service, savedObjects) => () => {
      service.setup({ savedObjects });
    },
    [DetectionStateService, CoreSetup('savedObjects')]
  );

  bind(DetectionStateClient)
    .toResolvedValue(
      (service, savedObjects) => service.start({ savedObjects }).getClient(),
      [DetectionStateService, CoreStart('savedObjects')]
    )
    .inSingletonScope();
}
