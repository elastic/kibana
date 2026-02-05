/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

/**
 * Builds filters for host details page following entity store EUID priority logic.
 * Priority order: host.entity.id > host.id > (host.name/hostname + host.domain) > (host.name/hostname + host.mac) > host.name > host.hostname
 *
 * For composite cases (host.name + host.domain or host.name + host.mac), multiple filters are returned
 * to match the EUID logic where composite identifiers are created.
 */
export const getHostDetailsPageFilters = (entityIdentifiers: Record<string, string>): Filter[] => {
  const filters: Filter[] = [];

  // Priority 1: host.entity.id
  if (entityIdentifiers['host.entity.id']) {
    filters.push(createFilter('host.entity.id', entityIdentifiers['host.entity.id']));
    return filters;
  }

  // Priority 2: host.id
  if (entityIdentifiers['host.id']) {
    filters.push(createFilter('host.id', entityIdentifiers['host.id']));
    return filters;
  }

  // Priority 3: host.name + host.domain (composite case)
  if (entityIdentifiers['host.name'] && entityIdentifiers['host.domain']) {
    filters.push(createFilter('host.name', entityIdentifiers['host.name']));
    filters.push(createFilter('host.domain', entityIdentifiers['host.domain']));
    return filters;
  }

  // Priority 3: host.hostname + host.domain (composite case)
  if (entityIdentifiers['host.hostname'] && entityIdentifiers['host.domain']) {
    filters.push(createFilter('host.hostname', entityIdentifiers['host.hostname']));
    filters.push(createFilter('host.domain', entityIdentifiers['host.domain']));
    return filters;
  }

  // Priority 4: host.name + host.mac (composite case)
  if (entityIdentifiers['host.name'] && entityIdentifiers['host.mac']) {
    filters.push(createFilter('host.name', entityIdentifiers['host.name']));
    filters.push(createFilter('host.mac', entityIdentifiers['host.mac']));
    return filters;
  }

  // Priority 4: host.hostname + host.mac (composite case)
  if (entityIdentifiers['host.hostname'] && entityIdentifiers['host.mac']) {
    filters.push(createFilter('host.hostname', entityIdentifiers['host.hostname']));
    filters.push(createFilter('host.mac', entityIdentifiers['host.mac']));
    return filters;
  }

  // Priority 5: host.name
  if (entityIdentifiers['host.name']) {
    filters.push(createFilter('host.name', entityIdentifiers['host.name']));
    return filters;
  }

  // Priority 6: host.hostname
  if (entityIdentifiers['host.hostname']) {
    filters.push(createFilter('host.hostname', entityIdentifiers['host.hostname']));
    return filters;
  }

  return filters;
};

/**
 * Helper function to create a Filter object for a given field and value
 */
const createFilter = (field: string, value: string): Filter => ({
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: field,
    value,
    params: {
      query: value,
    },
  },
  query: {
    match: {
      [field]: {
        query: value,
        type: 'phrase',
      },
    },
  },
});
