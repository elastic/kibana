/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { z } from '@kbn/zod';
import { isSchema, safeParseResult } from '@kbn/zod-helpers';
import {
  budgetingMethodSchemaZod,
  dashboardsWithIdSchemaZod,
  indicatorSchemaZod,
  objectiveSchemaZod,
  optionalSettingsSchemaZod,
  tagsSchemaZod,
  timeWindowSchemaZod,
  type Paginated,
  type Pagination,
} from '@kbn/slo-schema';
import type { SLOTemplate, StoredSLOTemplate } from '../domain/models';
import { SLOTemplateNotFound } from '../errors';
import { SO_SLO_TEMPLATE_TYPE } from '../saved_objects';

interface SearchParams {
  pagination: Pagination;
  search?: string;
  tags?: string[];
}

interface TagsAggregationResponse {
  tagsAggs: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
}
export interface SLOTemplateRepository {
  findById(templateId: string): Promise<SLOTemplate>;
  search(params: SearchParams): Promise<Paginated<SLOTemplate>>;
  tags(): Promise<string[]>;
}

export class DefaultSLOTemplateRepository implements SLOTemplateRepository {
  constructor(private soClient: SavedObjectsClientContract) {}

  async findById(templateId: string): Promise<SLOTemplate> {
    try {
      const response = await this.soClient.get<StoredSLOTemplate>(SO_SLO_TEMPLATE_TYPE, templateId);

      return this.toSloTemplate(response.id, response.attributes);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw new SLOTemplateNotFound(`SLO Template with id [${templateId}] not found`);
      }
      throw e;
    }
  }

  async search({ search, pagination, tags }: SearchParams): Promise<Paginated<SLOTemplate>> {
    const filters = [];
    if (tags && tags.length) {
      filters.push(`slo_template.attributes.tags: (${tags.join(' OR ')})`);
    }

    const response = await this.soClient.find<StoredSLOTemplate>({
      type: SO_SLO_TEMPLATE_TYPE,
      page: pagination.page,
      perPage: pagination.perPage,
      search,
      searchFields: ['name'],
      ...(filters.length && { filter: filters.join(' AND ') }),
    });

    return {
      total: response.total,
      perPage: response.per_page,
      page: response.page,
      results: response.saved_objects.map((so) => this.toSloTemplate(so.id, so.attributes)),
    };
  }

  async tags(): Promise<string[]> {
    const response = await this.soClient.find<StoredSLOTemplate>({
      type: SO_SLO_TEMPLATE_TYPE,
      perPage: 0,
      aggs: {
        tagsAggs: {
          terms: {
            field: `${SO_SLO_TEMPLATE_TYPE}.attributes.tags`,
            size: 10000,
            order: {
              _key: 'asc',
            },
          },
        },
      },
    });

    const aggs = response.aggregations as TagsAggregationResponse | undefined;
    return aggs?.tagsAggs?.buckets?.map(({ key }) => key) ?? [];
  }

  // isSchema keeps the stored value as-is; safeParseResult is needed for the fields holding
  // durationType values stored as "1h" and decoded as Duration.
  private toSloTemplate(id: string, stored: StoredSLOTemplate): SLOTemplate {
    try {
      const template: SLOTemplate = { templateId: id };
      if (stored.name && typeof stored.name === 'string') {
        template.name = stored.name;
      }

      if (stored.description && typeof stored.description === 'string') {
        template.description = stored.description;
      }

      // TODO: Consider using individual indicator schemas based on indicator.type with fallback for the required fields
      // e.g. for 'sli.kql.custom' we can validate only against the custom indicator schema using
      // Object.assign({}, { filter: "", good: "", total: "", ... }, stored.indicator.params)
      if (stored.indicator && isSchema(indicatorSchemaZod, stored.indicator)) {
        template.indicator = stored.indicator;
      }

      if (stored.budgetingMethod && isSchema(budgetingMethodSchemaZod, stored.budgetingMethod)) {
        template.budgetingMethod = stored.budgetingMethod;
      }

      const objective = safeParseResult(stored.objective, objectiveSchemaZod);
      if (objective) {
        template.objective = objective;
      }

      const timeWindow = safeParseResult(stored.timeWindow, timeWindowSchemaZod);
      if (timeWindow) {
        template.timeWindow = timeWindow;
      }

      if (stored.tags && isSchema(tagsSchemaZod, stored.tags)) {
        template.tags = stored.tags;
      }

      const settings = safeParseResult(stored.settings, optionalSettingsSchemaZod);
      if (settings) {
        template.settings = settings;
      }

      if (stored.groupBy && isSchema(z.array(z.string()), stored.groupBy)) {
        template.groupBy = stored.groupBy;
      }

      if (stored.artifacts && isSchema(dashboardsWithIdSchemaZod, stored.artifacts)) {
        template.artifacts = stored.artifacts;
      }

      return template;
    } catch {
      return { templateId: id };
    }
  }
}
