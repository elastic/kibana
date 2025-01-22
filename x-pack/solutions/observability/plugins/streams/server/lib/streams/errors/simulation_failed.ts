/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

export class SimulationFailed extends Error {
  constructor(error: errors.ResponseError) {
    super(
      error.body?.error?.reason ||
        error.body?.error?.caused_by?.reason ||
        error.message ||
        'Unknown error'
    );
    this.name = 'SimulationFailed';
  }
}
