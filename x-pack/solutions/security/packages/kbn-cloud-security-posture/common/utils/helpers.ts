/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';

import { i18n } from '@kbn/i18n';
import type { CspBenchmarkRulesStates } from '../schema/rules/latest';
import { GENERIC_ENTITY_INDEX_ENRICH_POLICY } from '../constants';

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

/**
 * Adds optional related host filters to the filters array
 */
const addRelatedHostFilters = (
  filters: QueryDslQueryContainer[],
  entityIdentifiers: Record<string, string>
): void => {
  if (entityIdentifiers['host.id']) {
    filters.push({ term: { 'host.id': entityIdentifiers['host.id'] } });
  }
  if (entityIdentifiers['host.domain']) {
    filters.push({ term: { 'host.domain': entityIdentifiers['host.domain'] } });
  }
  if (entityIdentifiers['host.name']) {
    filters.push({ term: { 'host.name': entityIdentifiers['host.name'] } });
  }
  if (entityIdentifiers['host.hostname']) {
    filters.push({ term: { 'host.hostname': entityIdentifiers['host.hostname'] } });
  }
};

/**
 * Builds host entity filters following EUID priority logic
 */
const buildHostEntityFilters = (
  entityIdentifiers: Record<string, string>
): QueryDslQueryContainer[] | null => {
  const filters: QueryDslQueryContainer[] = [];

  if (entityIdentifiers['host.entity.id']) {
    filters.push({ term: { 'host.entity.id': entityIdentifiers['host.entity.id'] } });
    return filters;
  }

  if (entityIdentifiers['host.id']) {
    filters.push({ term: { 'host.id': entityIdentifiers['host.id'] } });
    return filters;
  }

  if (entityIdentifiers['host.name']) {
    filters.push({ term: { 'host.name': entityIdentifiers['host.name'] } });
    if (entityIdentifiers['host.domain']) {
      filters.push({ term: { 'host.domain': entityIdentifiers['host.domain'] } });
    }
    if (entityIdentifiers['host.mac']) {
      filters.push({ term: { 'host.mac': entityIdentifiers['host.mac'] } });
    }
    return filters;
  }

  if (entityIdentifiers['host.hostname']) {
    filters.push({ term: { 'host.hostname': entityIdentifiers['host.hostname'] } });
    if (entityIdentifiers['host.domain']) {
      filters.push({ term: { 'host.domain': entityIdentifiers['host.domain'] } });
    }
    if (entityIdentifiers['host.mac']) {
      filters.push({ term: { 'host.mac': entityIdentifiers['host.mac'] } });
    }
    return filters;
  }

  return null;
};

/**
 * Builds user entity filters following EUID priority logic
 */
const buildUserEntityFilters = (
  entityIdentifiers: Record<string, string>
): QueryDslQueryContainer[] | null => {
  const filters: QueryDslQueryContainer[] = [];

  if (entityIdentifiers['user.entity.id']) {
    filters.push({ term: { 'user.entity.id': entityIdentifiers['user.entity.id'] } });
    return filters;
  }

  if (entityIdentifiers['user.id']) {
    filters.push({ term: { 'user.id': entityIdentifiers['user.id'] } });
    return filters;
  }

  if (entityIdentifiers['user.email']) {
    filters.push({ term: { 'user.email': entityIdentifiers['user.email'] } });
    return filters;
  }

  if (entityIdentifiers['user.name']) {
    filters.push({ term: { 'user.name': entityIdentifiers['user.name'] } });
    if (entityIdentifiers['user.domain']) {
      filters.push({ term: { 'user.domain': entityIdentifiers['user.domain'] } });
    }
    addRelatedHostFilters(filters, entityIdentifiers);
    return filters;
  }

  return null;
};

/**
 * Unified method to build Elasticsearch query filters from entityIdentifiers following entity store EUID priority logic.
 * Priority order for hosts: host.entity.id > host.id > (host.name/hostname + host.domain) > (host.name/hostname + host.mac) > host.name > host.hostname
 * Priority order for users: user.entity.id > user.id > user.email > user.name (with related fields)
 *
 * @param entityIdentifiers - Key-value pairs of field names and their values
 * @returns Array of QueryDslQueryContainer filters
 */
export const buildEntityFiltersFromEntityIdentifiers = (
  entityIdentifiers: Record<string, string>
): QueryDslQueryContainer[] => {
  // Try host entity identifiers first
  const hostFilters = buildHostEntityFilters(entityIdentifiers);
  if (hostFilters) {
    return hostFilters;
  }

  // Try user entity identifiers
  const userFilters = buildUserEntityFilters(entityIdentifiers);
  if (userFilters) {
    return userFilters;
  }

  // IP address fields (source.ip, destination.ip) - fallback for network pages
  if (entityIdentifiers['source.ip']) {
    return [{ term: { 'source.ip': entityIdentifiers['source.ip'] } }];
  }

  if (entityIdentifiers['destination.ip']) {
    return [{ term: { 'destination.ip': entityIdentifiers['destination.ip'] } }];
  }

  // Fallback: if no standard entity identifiers found, use the first available field-value pair
  const entries = Object.entries(entityIdentifiers);
  if (entries.length > 0) {
    const [field, value] = entries[0];
    return [{ term: { [field]: value } }];
  }

  return [];
};

export const buildGenericEntityFlyoutPreviewQuery = (
  entityIdentifiers: Record<string, string>,
  status?: string,
  queryField?: string
) => {
  const entityFilters = buildEntityFiltersFromEntityIdentifiers(entityIdentifiers);

  return {
    bool: {
      filter: [
        ...entityFilters,
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
  entityIdentifiers: Record<string, string>,
  status?: string
) => {
  const queryField = 'result.evaluation';
  return buildGenericEntityFlyoutPreviewQuery(entityIdentifiers, status, queryField);
};

// Higher-order function for Vulnerability
export const buildVulnerabilityEntityFlyoutPreviewQuery = (
  entityIdentifiers: Record<string, string>,
  status?: string
) => {
  const queryField = 'vulnerability.severity';
  return buildGenericEntityFlyoutPreviewQuery(entityIdentifiers, status, queryField);
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
