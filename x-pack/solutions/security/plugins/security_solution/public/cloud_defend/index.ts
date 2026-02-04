/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySubPlugin } from '../app/types';
import { routes } from './routes';

export class CloudDefend {
  public setup() {}

  /* Currently we are hiding the route in serverless due to Billing. Once we finished Billing for Cloud defend we can remove this */
  public start(isServerless: boolean = false): SecuritySubPlugin {
    if (isServerless) {
      return { routes: [] };
    }

    return { routes };
  }
}
