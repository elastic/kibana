/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../common';
import type { SecuritySubPlugin } from '../app/types';
import { getDetonateRoutes } from './routes';

export class Detonate {
  public setup() {}

  public start(experimentalFeatures: ExperimentalFeatures): SecuritySubPlugin {
    return { routes: getDetonateRoutes(experimentalFeatures) };
  }
}
