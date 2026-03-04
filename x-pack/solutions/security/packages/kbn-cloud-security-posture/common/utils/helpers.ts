/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { i18n } from '@kbn/i18n';

import type { CspBenchmarkRulesStates } from '../schema/rules/latest';
import { GENERIC_ENTITY_INDEX_ENRICH_POLICY, ENTITIES_LATEST_INDEX } from '../constants';

/** Query field for misconfiguration findings (result.evaluation) */
export const MISCONFIGURATION_QUERY_FIELD = 'result.evaluation';
/** Query field for vulnerability findings (vulnerability.severity) */
export const VULNERABILITY_QUERY_FIELD = 'vulnerability.severity';

/**
 * Builds a bool query for entity flyout preview: entity filters plus optional status/queryField clause.
 * Use with entity filters from @kbn/entity-store (e.g. buildEntityFiltersFromEntityIdentifiers).
 *
 * @param entityFilters - Pre-built entity filters (e.g. from buildEntityFiltersFromEntityIdentifiers)
 * @param status - Optional status value to filter on (case-insensitive)
 * @param queryField - Optional field name for the status term query (e.g. MISCONFIGURATION_QUERY_FIELD or VULNERABILITY_QUERY_FIELD)
 */
export const buildEntityFlyoutPreviewQueryWithStatus = (
  entityFilters: QueryDslQueryContainer[],
  status?: string,
  queryField?: string
): { bool: { filter: QueryDslQueryContainer[] } } => {
  const statusClause: QueryDslQueryContainer | undefined =
    status && queryField
      ? {
          bool: {
            should: [
              {
                term: {
                  [queryField]: {
                    value: status,
                    case_insensitive: true,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        }
      : undefined;

  return {
    bool: {
      filter: statusClause ? [...entityFilters, statusClause] : entityFilters,
    },
  };
};

interface BuildEntityAlertsQueryParams {
  field: string;
  to: string;
  from: string;
  queryValue?: string;
  size?: number;
  severity?: string;
  sortField?: string;
  sortDirection?: string;
}

export const defaultErrorMessage = i18n.translate(
  'securitySolutionPackages.csp.common.utils.helpers.unknownError',
  {
    defaultMessage: 'Unknown Error',
  }
);

export const extractErrorMessage = (e: unknown, fallbackMessage?: string): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;

  return fallbackMessage ?? defaultErrorMessage;
};

export const buildMutedRulesFilter = (
  rulesStates: CspBenchmarkRulesStates
): QueryDslQueryContainer[] => {
  const mutedRules = Object.fromEntries(
    Object.entries(rulesStates).filter(([key, value]) => value.muted === true)
  );

  const mutedRulesFilterQuery = Object.keys(mutedRules).map((key) => {
    const rule = mutedRules[key];
    return {
      bool: {
        must: [
          { term: { 'rule.benchmark.id': rule.benchmark_id } },
          { term: { 'rule.benchmark.version': rule.benchmark_version } },
          { term: { 'rule.benchmark.rule_number': rule.rule_number } },
        ],
      },
    };
  });

  return mutedRulesFilterQuery;
};

export const buildEntityAlertsQuery = ({
  field,
  to,
  from,
  queryValue = '',
  size = 0,
  severity,
  sortField,
  sortDirection,
}: BuildEntityAlertsQueryParams) => {
  return {
    size: size || 0,
    _source: false,
    sort: sortField ? [{ [sortField]: sortDirection }] : [],
    fields: [
      '_id',
      '_index',
      'kibana.alert.rule.uuid',
      'kibana.alert.severity',
      'kibana.alert.rule.name',
      'kibana.alert.workflow_status',
    ],
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  term: {
                    [field]: `${queryValue || ''}`,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          severity
            ? {
                bool: {
                  should: [
                    {
                      term: {
                        'kibana.alert.severity': severity,
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              }
            : undefined,
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
          {
            terms: {
              'kibana.alert.workflow_status': ['open', 'acknowledged'],
            },
          },
        ].filter(Boolean),
      },
    },
    // TODO: Asset Inventory - remove temp runtime mappings
    runtime_mappings: {
      'related.entity': {
        type: 'keyword',
      },
    },
  };
};

// Get the enrich policy ID for a specific space
export const getEnrichPolicyId = (space: string = 'default'): string => {
  return GENERIC_ENTITY_INDEX_ENRICH_POLICY.replace('<space>', space);
};

/**
 * Gets the entities latest index name (v2) for a specific space.
 * Used for LOOKUP JOIN queries.
 */
export const getEntitiesLatestIndexName = (spaceId: string = 'default'): string => {
  return ENTITIES_LATEST_INDEX.replace('<space>', spaceId);
};
