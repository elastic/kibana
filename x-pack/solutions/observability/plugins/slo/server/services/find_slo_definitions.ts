/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import type { IScopedClusterClient } from '@kbn/core/server';
import { IllegalArgumentError } from '../errors';
import type { SLORepository } from './slo_repository';
import { GetSLOHealth } from './get_slo_health';

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
    const requestTags: string[] = params.tags?.split(',') ?? [];

    const result = await this.repository.search(params.search ?? '', toPagination(params), {
      includeOutdatedOnly: !!params.includeOutdatedOnly,
      tags: requestTags,
    });

    if (params.includeHealth) {
      const getSLOHealth = new GetSLOHealth(this.scopedClusterClient);

      const healthResponses = await getSLOHealth.execute({
        list: result.results.map((item) => ({
          sloId: item.id,
          sloInstanceId: '*',
          sloRevision: item.revision,
          sloName: item.name,
        })),
      });

      const resultsWithHealth = result.results.map((slo) => {
        const healthInfo = healthResponses.data.find((health) => health.sloId === slo.id);
        return {
          ...slo,
          health: healthInfo?.health,
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
      results: result.results,
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
