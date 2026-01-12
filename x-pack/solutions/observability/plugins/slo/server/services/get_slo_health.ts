/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { FetchSLOHealthParams, FetchSLOHealthResponse } from '@kbn/slo-schema';
import { fetchSLOHealthResponseSchema } from '@kbn/slo-schema';
import { keyBy, map, uniq } from 'lodash';
import { computeHealth } from '../domain/services';
import type { SLODefinitionRepository } from './slo_definition_repository';

export class GetSLOHealth {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLODefinitionRepository
  ) {}

  public async execute(params: FetchSLOHealthParams): Promise<FetchSLOHealthResponse> {
    const sloIds = uniq(map(params.list, (item) => item.id));
    const definitions = await this.repository.findAllByIds(sloIds);
    const definitionById = keyBy(definitions, (definition) => definition.id);

    const list = params.list
      .filter((item) => !!definitionById[item.id])
      .map((item) => ({
        id: item.id,
        instanceId: item.instanceId,
        revision: definitionById[item.id].revision,
        name: definitionById[item.id].name,
        enabled: definitionById[item.id].enabled,
      }));

    const results = await computeHealth(list, { scopedClusterClient: this.scopedClusterClient });

    return fetchSLOHealthResponseSchema.encode(results);
  }
}
