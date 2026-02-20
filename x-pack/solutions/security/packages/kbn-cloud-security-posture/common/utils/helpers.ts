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

export const buildGenericEntityFlyoutPreviewQuery = (
  field: string,
  queryValue?: string,
  status?: string,
  queryField?: string
) => {
  return {
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
          : undefined,
      ].filter(Boolean),
    },
  };
};

// Higher-order function for Misconfiguration
export const buildMisconfigurationEntityFlyoutPreviewQuery = (
  field: string,
  queryValue?: string,
  status?: string
) => {
  const queryField = 'result.evaluation';
  return buildGenericEntityFlyoutPreviewQuery(field, queryValue, status, queryField);
};

// Higher-order function for Vulnerability
export const buildVulnerabilityEntityFlyoutPreviewQuery = (
  field: string,
  queryValue?: string,
  status?: string
) => {
  const queryField = 'vulnerability.severity';
  return buildGenericEntityFlyoutPreviewQuery(field, queryValue, status, queryField);
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
