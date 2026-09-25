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

const SINGLE_NAME = /^[^,*\s]+$/;

/**
 * Refuse to hand the provisioning client a name this module did not build. The concrete
 * index carries the value list prefix, the alias sits under the items prefix, and neither
 * is a pattern or a list of names. The storage descriptor is the only source of these
 * names and only this module writes it, so a failure here is a bug, not user input; the
 * check is defence in depth for calls that run as the Kibana system user.
 */
export const assertLookupNames = ({ index, alias }: { index: string; alias?: string }): void => {
  if (!index.startsWith(`${VALUE_LIST_INDEX_PREFIX}-`) || !SINGLE_NAME.test(index)) {
    throw new ErrorWithStatusCode(`"${index}" is not a value list lookup index name`, 500);
  }
  if (alias != null && (!alias.startsWith('.items-') || !SINGLE_NAME.test(alias))) {
    throw new ErrorWithStatusCode(`"${alias}" is not a value list alias name`, 500);
  }
};

/** Refuse an access name (the alias while shared, the concrete index once restricted) this module did not build. */
export const assertLookupAccessName = (name: string): void => {
  const isIndex = name.startsWith(`${VALUE_LIST_INDEX_PREFIX}-`);
  const isAlias = name.startsWith('.items-');
  if ((!isIndex && !isAlias) || !SINGLE_NAME.test(name)) {
    throw new ErrorWithStatusCode(`"${name}" is not a value list index or alias name`, 500);
  }
};

/** Pattern matching every concrete per-list lookup index in a space. */
export const getLookupIndexPattern = (spaceId: string): string =>
  `${VALUE_LIST_INDEX_PREFIX}-${spaceId}-*`;
