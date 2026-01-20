/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { EntityTypeToIdentifierField, EntityType } from '../../../../entity_analytics/types';
import type { ESQuery } from '../../../../typed_json';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../entity_analytics/risk_engine';

export const getRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return onlyLatest ? getRiskScoreLatestIndex(spaceId) : getRiskScoreTimeSeriesIndex(spaceId);
};

export const buildHostNamesFilter = (hostNames: string[]) => {
  return buildEntityNameFilter(EntityType.host, hostNames);
};

export const buildUserNamesFilter = (userNames: string[]) => {
  return buildEntityNameFilter(EntityType.user, userNames);
};

export const buildEntityNameFilter = (riskEntity: EntityType, entityNames: string[]): ESQuery => {
  return { terms: { [EntityTypeToIdentifierField[riskEntity]]: entityNames } };
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

/**
 * Builds an Elasticsearch filter for host queries based on entityIdentifiers.
 * Follows entity store EUID priority: host.entity.id > host.id > host.name/hostname
 * @param entityIdentifiers - Key-value pairs of field names and their values
 * @returns ESQuery filter object, or undefined if no valid identifiers found
 */
export const buildHostFilterFromEntityIdentifiers = (
  entityIdentifiers: Record<string, string>
): ESQuery | undefined => {
  const filters = buildEntityFiltersFromEntityIdentifiers(entityIdentifiers);
  // Return the first filter if it's a host-related filter, otherwise undefined
  if (filters.length > 0) {
    const firstFilter = filters[0];
    if (
      'term' in firstFilter &&
      firstFilter.term &&
      ('host.entity.id' in firstFilter.term ||
        'host.id' in firstFilter.term ||
        'host.name' in firstFilter.term ||
        'host.hostname' in firstFilter.term)
    ) {
      return firstFilter as ESQuery;
    }
  }
  return undefined;
};

export { EntityType };
