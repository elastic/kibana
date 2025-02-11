/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshSLOHealthParams } from '@kbn/slo-schema';
import { ComputeSLOHealth } from './compute_slo_health';

export class RefreshSLOHealth {
  constructor(private computeHealth: ComputeSLOHealth) {}

  public async execute(params: RefreshSLOHealthParams): Promise<void> {
    await this.computeHealth.execute(params.spaceId);
  }
}
