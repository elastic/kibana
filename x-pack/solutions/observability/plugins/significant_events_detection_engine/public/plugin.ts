/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import { createDetectionEngineRepositoryClient, type DetectionEngineRepositoryClient } from './api';

/** Browser start contract: the engine has no UI of its own, only this client. */
export interface DetectionEnginePublicStart {
  repositoryClient: DetectionEngineRepositoryClient;
}

export class DetectionEnginePublicPlugin implements Plugin<void, DetectionEnginePublicStart> {
  setup(): void {}

  start(core: CoreStart): DetectionEnginePublicStart {
    return { repositoryClient: createDetectionEngineRepositoryClient(core) };
  }
}
