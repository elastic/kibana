/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  FindSLODefinitionsParams,
  FindSLODefinitionsResponse,
  Pagination,
} from '@kbn/slo-schema';
import { findSloDefinitionsResponseSchema } from '@kbn/slo-schema';
import { keyBy } from 'lodash';
import type { SLODefinition } from '../domain/models';
import { computeHealth } from '../domain/services';
import { IllegalArgumentError } from '../errors';
import type { SLODefinitionRepository } from './slo_definition_repository';

const MAX_PER_PAGE = 1000;
const DEFAULT_PER_PAGE = 100;
const DEFAULT_PAGE = 1;

export class FindSLODefinitions {
  constructor(
    private repository: SLODefinitionRepository,
    private scopedClusterClient: IScopedClusterClient,
    private logger: Logger
  ) {}

  public async execute(params: FindSLODefinitionsParams): Promise<FindSLODefinitionsResponse> {
    const { results: definitions, ...result } = await this.repository.search({
      search: params.search,
      pagination: toPagination(params),
      filters: {
        includeOutdatedOnly: !!params.includeOutdatedOnly,
        tags: params.tags?.split(',') ?? [],
      },
    });

    if (params.includeHealth) {
      try {
        const definitionsWithHealth = await this.mergeWithHealth(definitions);
        return findSloDefinitionsResponseSchema.encode({
          page: result.page,
          perPage: result.perPage,
          total: result.total,
          results: definitionsWithHealth,
        });
      } catch (e) {
        this.logger.debug(`Failed to compute SLO health: ${e}`);
      }
    }

    return findSloDefinitionsResponseSchema.encode({
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      results: definitions,
    });
  }

  private async mergeWithHealth(definitions: SLODefinition[]) {
    const healthResults = await computeHealth(definitions, {
      scopedClusterClient: this.scopedClusterClient,
    });

    const healthBySloId = keyBy(healthResults, (health) => health.id);
    const definitionsWithHealth = definitions.map((definition) => {
      return {
        ...definition,
        health: healthBySloId[definition.id]?.health,
      };
    });

    return definitionsWithHealth;
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
    perPage: !isNaN(perPage) && perPage >= 0 ? perPage : DEFAULT_PER_PAGE,
  };
}
