/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOSummaryTransformId, getSLOTransformId } from '../../common/constants';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

export class ManageSLO {
  constructor(
    private repository: SLORepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private userId: string
  ) {}

  async enable(sloId: string) {
    const slo = await this.repository.findById(sloId);
    if (slo.enabled) {
      return;
    }

    if (slo.isTemplate) {
      throw new Error('Cannot enable a Template SLO');
    }

    await this.summaryTransformManager.start(getSLOSummaryTransformId(slo.id, slo.revision));
    await this.transformManager.start(getSLOTransformId(slo.id, slo.revision));
    slo.enabled = true;
    slo.updatedBy = this.userId;
    slo.updatedAt = new Date();
    await this.repository.update(slo);
  }

  async disable(sloId: string) {
    const slo = await this.repository.findById(sloId);
    if (!slo.enabled) {
      return;
    }

    if (slo.isTemplate) {
      throw new Error('Cannot disable a Template SLO');
    }

    await this.summaryTransformManager.stop(getSLOSummaryTransformId(slo.id, slo.revision));
    await this.transformManager.stop(getSLOTransformId(slo.id, slo.revision));
    slo.enabled = false;
    slo.updatedBy = this.userId;
    slo.updatedAt = new Date();
    await this.repository.update(slo);
  }
}
