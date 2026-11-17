/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import {
  DETECTION_STATE_SO_TYPE,
  detectionStateSavedObjectType,
} from '../../saved_objects/detection_state_saved_object';
import { DetectionStateClient } from './detection_state_client';
import type {
  DetectionStateServiceSetupDeps,
  DetectionStateServiceStart,
  DetectionStateServiceStartDeps,
} from './types';

/**
 * The engine's state, in two phases. Setup registers the saved object type; start builds the client
 * on the internal repository of that type, which only exists once Core has started.
 */
@injectable()
export class DetectionStateService {
  public setup({ savedObjects }: DetectionStateServiceSetupDeps): void {
    savedObjects.registerType(detectionStateSavedObjectType);
  }

  public start({ savedObjects }: DetectionStateServiceStartDeps): DetectionStateServiceStart {
    const client = new DetectionStateClient(
      savedObjects.createInternalRepository([DETECTION_STATE_SO_TYPE])
    );

    return { getClient: () => client };
  }
}
