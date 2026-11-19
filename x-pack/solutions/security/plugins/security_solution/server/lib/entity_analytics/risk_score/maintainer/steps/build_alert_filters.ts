/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { isEmpty } from 'lodash';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { RiskEngineConfiguration } from '../../../types';
import type { EntityType } from '../../../../../../common/search_strategy';
import { filterFromRange } from '../../helpers';
import { convertRangeToISO } from '../../tasks/helpers';
import type { ScopedLogger } from '../utils/with_log_context';

interface BuildCommonAlertFiltersParams {
  range: { start: string; end: string };
  filter?: unknown;
  excludeAlertStatuses?: string[];
  excludeAlertTags?: string[];
  filters?: RiskEngineConfiguration['filters'];
}

export const buildCommonAlertFilters = (
  params: BuildCommonAlertFiltersParams,
  entityType: EntityType,
  logger?: ScopedLogger
): QueryDslQueryContainer[] => {
  const { range, filter, excludeAlertStatuses, excludeAlertTags, filters: customFilters } = params;
  const filters: QueryDslQueryContainer[] = [
    filterFromRange(range),
    { exists: { field: 'kibana.alert.risk_score' } },
  ];

  if (!isEmpty(filter)) {
    filters.push(filter as QueryDslQueryContainer);
  }

  if (excludeAlertStatuses && excludeAlertStatuses.length > 0) {
    filters.push({
      bool: {
        must_not: {
          terms: { 'kibana.alert.workflow_status': excludeAlertStatuses },
        },
      },
    });
  }

  if (excludeAlertTags && excludeAlertTags.length > 0) {
    filters.push({
      bool: {
        must_not: { terms: { 'kibana.alert.workflow_tags': excludeAlertTags } },
      },
    });
  }

  // Apply entity-specific custom filters from saved object configuration.
  if (customFilters && customFilters.length > 0) {
    customFilters
      .filter((customFilter) => customFilter.entity_types.includes(entityType))
      .forEach((customFilter) => {
        try {
          const kqlQuery = fromKueryExpression(customFilter.filter);
          const esQuery = toElasticsearchQuery(kqlQuery);
          if (esQuery) {
            filters.push({
              bool: { must: esQuery },
            });
          }
        } catch (error) {
          // Ignore invalid KQL to avoid failing scoring runs due to bad user input.
          // Emit a warning so misconfigurations are observable.
          logger?.warn(
            `Skipping invalid KQL custom filter for ${entityType}: "${customFilter.filter}" — ${error}`
          );
        }
      });
  }

  return filters;
};

export const buildAlertFilters = (
  configuration: RiskEngineConfiguration,
  entityType: EntityType,
  logger?: ScopedLogger
): QueryDslQueryContainer[] => {
  return buildCommonAlertFilters(
    {
      range: convertRangeToISO(configuration.range),
      filter: configuration.filter,
      excludeAlertStatuses: configuration.excludeAlertStatuses,
      excludeAlertTags: configuration.excludeAlertTags,
      filters: configuration.filters,
    },
    entityType,
    logger
  );
};
