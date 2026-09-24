/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorWithStatusCode } from '../../error_with_status_code';

/**
 * One lookup-mode index per value list, addressed through two names.
 *
 * The concrete index is `.value-list-v2-<spaceId>-<normalized list id>`. It is the
 * name a role grants when a list is restricted to explicit grants.
 *
 * The alias is `<items index>-<normalized list id>`, for example
 * `.items-default-corp-ranges`. It sits under the `.items*` wildcard that existing
 * roles and rule API key snapshots already grant, so a shared list is readable with
 * no role change. Restricting a list removes the alias.
 *
 * The list id is user supplied and can contain characters that are illegal in an
 * index name, so both names use a normalized form. Normalization is lossy, so the
 * caller must reject a create when either name already exists.
 */
export const VALUE_LIST_INDEX_PREFIX = '.value-list-v2';

export const normalizeListId = (listId: string): string => {
  const normalized = listId
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/^[-_+.]+/, '');
  if (normalized.length === 0) {
    throw new ErrorWithStatusCode(
      `list id "${listId}" has no characters usable in an index name`,
      400
    );
  }
  return normalized;
};

export const getLookupIndexName = (spaceId: string, listId: string): string =>
  `${VALUE_LIST_INDEX_PREFIX}-${spaceId}-${normalizeListId(listId)}`;

export const getLookupAliasName = (listItemIndex: string, listId: string): string =>
  `${listItemIndex}-${normalizeListId(listId)}`;

/** Pattern matching every concrete per-list lookup index in a space. */
export const getLookupIndexPattern = (spaceId: string): string =>
  `${VALUE_LIST_INDEX_PREFIX}-${spaceId}-*`;
