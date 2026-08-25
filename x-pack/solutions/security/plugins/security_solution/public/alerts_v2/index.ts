/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySubPlugin } from '../app/types';
import { routes } from './routes';

/**
 * POC sub-plugin for the "Alerts v2" page (RnA / Alerting v2). Isolated from the
 * existing `detections` alerts sub-plugin so it can be developed and removed
 * independently.
 */
export class AlertsV2 {
  public setup() {}

  public start(): SecuritySubPlugin {
    return {
      routes,
    };
  }
}
