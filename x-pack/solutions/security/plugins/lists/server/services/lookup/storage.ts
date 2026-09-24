/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetaOrUndefined, Storage } from '@kbn/securitysolution-io-ts-list-types';

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
 * need no migration. An earlier POC stashed the descriptor inside `meta` under
 * `STORAGE_META_KEY`; that form is still read so lists it migrated keep resolving.
 */
export const STORAGE_META_KEY = '__vlStorage';

/** The parts of a list this module reads to resolve its storage. */
export interface ListStorageSource {
  storage?: Storage | null;
  meta?: MetaOrUndefined;
}

const DATA_STREAM: Storage = { type: 'data_stream' };

/** Read the legacy `meta.__vlStorage` stash, normalized to the current shape. */
const readLegacyMetaDescriptor = (meta: MetaOrUndefined): Storage | undefined => {
  const stash = (meta as Record<string, unknown> | undefined)?.[STORAGE_META_KEY] as
    | { type?: string; index?: string; locator?: { index?: string } }
    | undefined;
  if (stash == null) return undefined;
  if (stash.type === 'lookup' || stash.type === 'lookup_index') {
    const index = stash.locator?.index ?? stash.index;
    return { locator: index != null ? { index } : undefined, type: 'lookup_index' };
  }
  return undefined;
};

export const readStorageDescriptor = (list: ListStorageSource): Storage => {
  const fromField = list.storage ?? undefined;
  if (fromField?.type === 'lookup_index') return fromField;
  const fromMeta = readLegacyMetaDescriptor(list.meta);
  if (fromMeta != null) return fromMeta;
  return DATA_STREAM;
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
