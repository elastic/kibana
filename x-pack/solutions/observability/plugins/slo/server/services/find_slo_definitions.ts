/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type {
  FindSLODefinitionsParams,
  FindSLODefinitionsResponse,
  FindSLODefinitionsWithHealthResponse,
  Pagination,
} from '@kbn/slo-schema';
import {
  findSloDefinitionsResponseSchema,
  findSloDefinitionsWithHealthResponseSchema,
} from '@kbn/slo-schema';
import { keyBy } from 'lodash';
import { IllegalArgumentError } from '../errors';
import { GetSLOHealth } from './get_slo_health';
import type { SLORepository } from './slo_repository';

const MAX_PER_PAGE = 1000;
const DEFAULT_PER_PAGE = 100;
const DEFAULT_PAGE = 1;

export class FindSLODefinitions {
  constructor(
    private repository: SLORepository,
    private scopedClusterClient: IScopedClusterClient
  ) {}

  public async execute(
    params: FindSLODefinitionsParams
  ): Promise<FindSLODefinitionsResponse | FindSLODefinitionsWithHealthResponse> {
    const tags: string[] = params.tags?.split(',') ?? [];

    const { results: definitions, ...result } = await this.repository.search(
      params.search ?? '',
      toPagination(params),
      { includeOutdatedOnly: !!params.includeOutdatedOnly, tags }
    );

    if (params.includeHealth) {
      const getSLOHealth = new GetSLOHealth(this.scopedClusterClient, this.repository);

      const healthResponses = await getSLOHealth.execute({
        list: definitions.map((definition) => ({
          sloId: definition.id,
          sloInstanceId: '*',
        })),
      });

      const healthBySloId = keyBy(healthResponses, 'sloId');
      const resultsWithHealth = definitions.map((definition) => {
        return {
          ...definition,
          state: healthBySloId[definition.id]?.state,
          health: healthBySloId[definition.id]?.health,
        };
      });

      return findSloDefinitionsWithHealthResponseSchema.encode({
        page: result.page,
        perPage: result.perPage,
        total: result.total,
        results: resultsWithHealth,
      });
    }

    return findSloDefinitionsResponseSchema.encode({
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      results: definitions,
    });
  }
}

function toPagination(params: FindSLODefinitionsParams): Pagination {
  const page = Number(params.page);
  const perPage = Number(params.perPage);

  if (!isNaN(perPage) && perPage > MAX_PER_PAGE) {
    throw new IllegalArgumentError(`perPage limit set to ${MAX_PER_PAGE}`);
  }

  return {
    page: !isNaN(page) && page >= 1 ? page : DEFAULT_PAGE,
    perPage: !isNaN(perPage) && perPage >= 1 ? perPage : DEFAULT_PER_PAGE,
  };
}
