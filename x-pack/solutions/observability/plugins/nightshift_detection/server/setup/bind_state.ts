/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnSetup } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-server';
import { DetectionStateClient } from '../lib/state/detection_state_client';
import {
  DETECTION_STATE_SO_TYPE,
  detectionStateSavedObjectType,
} from '../saved_objects/detection_state_saved_object';

/** Registers the state saved object type and binds the client on it. */
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
