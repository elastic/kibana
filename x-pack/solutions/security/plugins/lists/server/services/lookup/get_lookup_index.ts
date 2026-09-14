/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POC: one lookup-mode index per value list.
 *
 * Deterministic name from the space id and the list id, so an exception
 * reference (which is just the list id) always resolves to the same index.
 * The list id can be user supplied, so it is sanitized to a legal index name.
 * Production would hash the id and keep the real id in the registry; here we
 * sanitize for readability and note the shortcut.
 */
export const VALUE_LIST_INDEX_PREFIX = '.value-list';

export const getLookupIndexName = (spaceId: string, listId: string): string => {
  const sanitized = listId
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/^[-_+.]+/, '');
  return `${VALUE_LIST_INDEX_PREFIX}-${spaceId}-${sanitized}`;
};

/** Pattern matching every per-list lookup index in a space. */
export const getLookupIndexPattern = (spaceId: string): string =>
  `${VALUE_LIST_INDEX_PREFIX}-${spaceId}-*`;
