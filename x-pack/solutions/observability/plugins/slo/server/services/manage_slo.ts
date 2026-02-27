/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOSummaryTransformId, getSLOTransformId } from '../../common/constants';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';

export class ManageSLO {
  constructor(
    private repository: SLODefinitionRepository,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private userId: string
  ) {}

  async enable(sloId: string) {
    const slo = await this.repository.findById(sloId);
    if (slo.enabled) {
      return;
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

    await this.summaryTransformManager.stop(getSLOSummaryTransformId(slo.id, slo.revision));
    await this.transformManager.stop(getSLOTransformId(slo.id, slo.revision));
    slo.enabled = false;
    slo.updatedBy = this.userId;
    slo.updatedAt = new Date();
    await this.repository.update(slo);
  }
}
