/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup, SavedObjectsServiceStart } from '@kbn/core/server';
import type { DetectionStateClient } from './detection_state_client';

export interface DetectionStateServiceSetupDeps {
  savedObjects: SavedObjectsServiceSetup;
}

export interface DetectionStateServiceStartDeps {
  savedObjects: SavedObjectsServiceStart;
}

export interface DetectionStateServiceStart {
  /** The client of the engine's state. It acts as the internal user, in the space it is given. */
  getClient(): DetectionStateClient;
}
