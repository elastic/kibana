/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

const createFilter = (key: string, value: string): Filter => ({
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key,
    value,
    params: { query: value },
  },
  query: {
    match: {
      [key]: { query: value, type: 'phrase' },
    },
  },
});

/**
 * Builds filters for host details page following entity store EUID priority logic.
 * Priority order: host.entity.id > host.id > (host.name + host.domain) > (host.name + host.mac) > host.name > host.hostname
 *
 * For URL params with host.name only: entityIdentifiers = { 'host.name': detailName }
 */
export const getHostDetailsPageFilters = (
  entityIdentifiers: Record<string, string>
): Filter[] => {
  if (entityIdentifiers['host.entity.id']) {
    return [createFilter('host.entity.id', entityIdentifiers['host.entity.id'])];
  }
  if (entityIdentifiers['host.id']) {
    return [createFilter('host.id', entityIdentifiers['host.id'])];
  }
  if (entityIdentifiers['host.name'] && entityIdentifiers['host.domain']) {
    return [
      createFilter('host.name', entityIdentifiers['host.name']),
      createFilter('host.domain', entityIdentifiers['host.domain']),
    ];
  }
  if (entityIdentifiers['host.hostname'] && entityIdentifiers['host.domain']) {
    return [
      createFilter('host.hostname', entityIdentifiers['host.hostname']),
      createFilter('host.domain', entityIdentifiers['host.domain']),
    ];
  }
  if (entityIdentifiers['host.name'] && entityIdentifiers['host.mac']) {
    return [
      createFilter('host.name', entityIdentifiers['host.name']),
      createFilter('host.mac', entityIdentifiers['host.mac']),
    ];
  }
  if (entityIdentifiers['host.hostname'] && entityIdentifiers['host.mac']) {
    return [
      createFilter('host.hostname', entityIdentifiers['host.hostname']),
      createFilter('host.mac', entityIdentifiers['host.mac']),
    ];
  }
  if (entityIdentifiers['host.name']) {
    return [createFilter('host.name', entityIdentifiers['host.name'])];
  }
  if (entityIdentifiers['host.hostname']) {
    return [createFilter('host.hostname', entityIdentifiers['host.hostname'])];
  }
  // Fallback for legacy: use first available value
  const entries = Object.entries(entityIdentifiers);
  return entries.length > 0 ? [createFilter(entries[0][0], entries[0][1])] : [];
};
