/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnSetup } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-server';
import {
  DETECTION_STATE_SO_TYPE,
  DetectionStateClient,
  detectionStateSavedObjectType,
} from '../lib/state';

/**
 * The module's setup and start phases are the `OnSetup` hook and the `CoreStart` token: the type is
 * registered at setup, and the client is built once Core has started, on the internal repository of
 * that type.
 */
export function bindState({ bind }: ContainerModuleLoadOptions): void {
  bind(OnSetup).toResolvedValue(
    (savedObjects) => () => {
      savedObjects.registerType(detectionStateSavedObjectType);
    },
    [CoreSetup('savedObjects')]
  );

  bind(DetectionStateClient)
    .toResolvedValue(
      (savedObjects) =>
        new DetectionStateClient(savedObjects.createInternalRepository([DETECTION_STATE_SO_TYPE])),
      [CoreStart('savedObjects')]
    )
    .inSingletonScope();
}
