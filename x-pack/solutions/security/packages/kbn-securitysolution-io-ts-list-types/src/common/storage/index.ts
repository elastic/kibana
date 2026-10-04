/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/**
 * Per-list storage descriptor on the `.lists-<space>` container document. Names
 * the storage kind, and for a lookup list the concrete index that holds its items.
 * Absence reads as a legacy data-stream list, so pre-existing lists need no
 * migration. `locator` is an opaque, storage-kind-specific location, so a future
 * storage kind can add its own shape without reusing `index` to mean two things.
 */
export const storageType = t.keyof({
  data_stream: null,
  lookup_index: null,
  regular_index: null,
});
export type StorageType = t.TypeOf<typeof storageType>;

export const storageLocator = t.partial({ alias: t.string, index: t.string });
export type StorageLocator = t.TypeOf<typeof storageLocator>;

export const storage = t.intersection([
  t.type({ type: storageType }),
  t.partial({ locator: storageLocator }),
]);
export type Storage = t.TypeOf<typeof storage>;

export const storageOrUndefined = t.union([storage, t.undefined]);
export type StorageOrUndefined = t.TypeOf<typeof storageOrUndefined>;

export const nullableStorageOrUndefined = t.union([storageOrUndefined, t.null]);
export type NullableStorageOrUndefined = t.TypeOf<typeof nullableStorageOrUndefined>;
