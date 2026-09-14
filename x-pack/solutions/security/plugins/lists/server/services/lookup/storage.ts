/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetaOrUndefined } from '@kbn/securitysolution-io-ts-list-types';

/**
 * Per-list storage descriptor. Absence reads as a legacy data-stream list, so
 * pre-existing lists need no migration.
 *
 * POC: the descriptor is carried inside the container `meta` (which is
 * `enabled: false`, so no mapping change) under a reserved key. Production would
 * use a dedicated `storage` field on `.lists-<space>` as the proposal describes.
 */
export const STORAGE_META_KEY = '__vlStorage';

export type StorageType = 'data_stream' | 'lookup';

export interface StorageDescriptor {
  type: StorageType;
  index?: string; // concrete lookup index name, present for lookup lists
}

export const readStorageDescriptor = (meta: MetaOrUndefined): StorageDescriptor => {
  const descriptor = (meta as Record<string, unknown> | undefined)?.[STORAGE_META_KEY];
  if (descriptor != null && (descriptor as StorageDescriptor).type === 'lookup') {
    return descriptor as StorageDescriptor;
  }
  return { type: 'data_stream' };
};

export const withStorageDescriptor = (
  meta: MetaOrUndefined,
  descriptor: StorageDescriptor
): Record<string, unknown> => ({
  ...(meta as Record<string, unknown> | undefined),
  [STORAGE_META_KEY]: descriptor,
});

export const isLookupList = (meta: MetaOrUndefined): boolean =>
  readStorageDescriptor(meta).type === 'lookup';
