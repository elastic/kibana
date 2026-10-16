/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { CreateEngineScope } from '../lib/engine/engine_scope';
import type { IAutoRunScheduler } from '../lib/scheduler/auto_run';

/** What every route handler gets, next to the request and its context. */
export interface DetectionEngineRouteDependencies {
  /** Resolves once the plugin started; routes registered at setup can be hit before that. */
  getStartServices: () => Promise<{
    createScope: CreateEngineScope;
    scheduler: IAutoRunScheduler;
  }>;
}

export type DetectionEngineRouteResources = DetectionEngineRouteDependencies &
  DefaultRouteHandlerResources;
