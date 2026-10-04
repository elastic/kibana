/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/securitysolution-io-ts-list-types';

import { ErrorWithStatusCode } from '../../error_with_status_code';

import { getLookupAliasName, getLookupIndexName } from './get_lookup_index';

/**
 * The storage descriptor lives in a top-level `storage` field on the
 * `.lists-<space>` container document:
 *
 *   { type: 'lookup_index', locator: { index: <concrete index>, alias?: <alias> } }
 *
 * `index` is always the concrete lookup index. `alias` is present while the list is
 * shared: the alias sits under the `.items*` wildcard that existing roles grant, so
 * every read and write addresses `alias ?? index`. Restricting a list removes the
 * alias, so only roles that grant the concrete name can reach it.
 *
 * Absence of `storage` reads as a legacy data-stream list, so pre-existing lists
 * need no migration. Only provisioning and migration write the field, and the public
 * update and patch routes never do, but a list user holds Elasticsearch write on the
 * container and can set it directly. The names it holds go to the internal client for
 * index deletion, alias changes, mapping upgrades, and the coalesce task, so they are
 * never trusted as read: `assertStorageDescriptor` checks that they are exactly the names
 * this module derives from the space and the list id, and every read of a list runs it.
 */

/** The parts of a list this module reads to resolve its storage. */
export interface ListStorageSource {
  id: string;
  storage?: Storage | null;
}

const DATA_STREAM: Storage = { type: 'data_stream' };

export const readStorageDescriptor = (list: ListStorageSource): Storage => {
  const fromField = list.storage ?? undefined;
  if (fromField?.type === 'lookup_index') return fromField;
  return DATA_STREAM;
};

/**
 * Refuse a lookup descriptor whose names are not the ones derived from the space and the
 * list id. The descriptor is derived data; a different name means it was written by hand,
 * and acting on it would let a list writer point the internal client at another list's
 * index, in this space or another. A legacy list has nothing to check.
 */
export const assertStorageDescriptor = ({
  list,
  spaceId,
  listItemIndex,
}: {
  list: ListStorageSource;
  spaceId: string;
  listItemIndex: string;
}): void => {
  const descriptor = readStorageDescriptor(list);
  if (descriptor.type !== 'lookup_index') return;
  const expectedIndex = getLookupIndexName(spaceId, list.id);
  const expectedAlias = getLookupAliasName(listItemIndex, list.id);
  const { index, alias } = descriptor.locator ?? {};
  if (index !== expectedIndex || (alias != null && alias !== expectedAlias)) {
    throw new ErrorWithStatusCode(
      `list "${list.id}" has a storage descriptor naming "${
        alias ?? index
      }", which is not this list's index; the descriptor was not written by the lists plugin`,
      500
    );
  }
};

export const isLookupList = (list: ListStorageSource): boolean =>
  readStorageDescriptor(list).type === 'lookup_index';

/** The concrete lookup index of a list, or undefined when it is not a lookup list. */
export const lookupIndexOf = (list: ListStorageSource): string | undefined => {
  const descriptor = readStorageDescriptor(list);
  return descriptor.type === 'lookup_index' ? descriptor.locator?.index : undefined;
};

/** The alias of a shared lookup list, or undefined when the list is restricted or not a lookup list. */
export const lookupAliasOf = (list: ListStorageSource): string | undefined => {
  const descriptor = readStorageDescriptor(list);
  return descriptor.type === 'lookup_index' ? descriptor.locator?.alias : undefined;
};

/**
 * The name every read and write uses: the alias while the list is shared, the
 * concrete index once it is restricted. Undefined when the list is not a lookup list.
 */
export const lookupAccessNameOf = (list: ListStorageSource): string | undefined =>
  lookupAliasOf(list) ?? lookupIndexOf(list);

/** Build the storage descriptor for a lookup list. Omit `alias` for a restricted list. */
export const lookupStorage = (index: string, alias?: string): Storage => ({
  locator: alias != null ? { alias, index } : { index },
  type: 'lookup_index',
});
