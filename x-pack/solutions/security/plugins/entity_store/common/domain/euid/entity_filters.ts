/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { getEuidDslFilterBasedOnDocument } from './dsl';

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
  const hostFilters = getEuidDslFilterBasedOnDocument('host', entityIdentifiers);
  if (hostFilters) {
    return [hostFilters];
  }

  const userFilters = getEuidDslFilterBasedOnDocument('user', entityIdentifiers);
  if (userFilters) {
    return [userFilters];
  }

  if (entityIdentifiers['source.ip']) {
    return [{ term: { 'source.ip': entityIdentifiers['source.ip'] } }];
  }

  if (entityIdentifiers['destination.ip']) {
    return [{ term: { 'destination.ip': entityIdentifiers['destination.ip'] } }];
  }

  const entries = Object.entries(entityIdentifiers);
  if (entries.length > 0) {
    const [field, value] = entries[0];
    return [{ term: { [field]: value } }];
  }

  return [];
};

/**
 * Builds a generic bool query for entity flyout preview: entity filters plus optional status/queryField clause.
 *
 * @param entityIdentifiers - Key-value pairs of field names and their values
 * @param status - Optional status value to filter on (case-insensitive)
 * @param queryField - Optional field name for the status term query
 * @returns Bool query with filter array
 */
export const buildGenericEntityFlyoutPreviewQuery = (
  entityIdentifiers: Record<string, string>,
  status?: string,
  queryField?: string
): { bool: { filter: QueryDslQueryContainer[] } } => {
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
      ].filter(Boolean) as QueryDslQueryContainer[],
    },
  };
};
