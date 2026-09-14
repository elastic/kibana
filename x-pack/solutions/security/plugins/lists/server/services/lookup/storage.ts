/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetaOrUndefined, Storage } from '@kbn/securitysolution-io-ts-list-types';

/**
 * The storage descriptor lives in a top-level `storage` field on the
 * `.lists-<space>` container document (shape `{ type, locator: { index } }`).
 * Absence reads as a legacy data-stream list, so pre-existing lists need no
 * migration. An earlier POC stashed the descriptor inside `meta` under this key;
 * we still read that so lists migrated by the POC keep resolving.
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

/** The concrete lookup index for a list, or undefined when it is not a lookup list. */
export const lookupIndexOf = (list: ListStorageSource): string | undefined => {
  const descriptor = readStorageDescriptor(list);
  return descriptor.type === 'lookup_index' ? descriptor.locator?.index : undefined;
};

/** Build the storage descriptor for a lookup list at the given index. */
export const lookupStorage = (index: string): Storage => ({
  locator: { index },
  type: 'lookup_index',
});
