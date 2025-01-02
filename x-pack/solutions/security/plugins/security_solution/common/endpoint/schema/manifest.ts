/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  compressionAlgorithm,
  compressionAlgorithmDispatch,
  encryptionAlgorithm,
  identifier,
  manifestSchemaVersion,
  relativeUrl,
  sha256,
  semanticVersion,
  size,
} from './common';

export const manifestEntryBaseSchema = t.exact(
  t.type({
    relative_url: relativeUrl,
    decoded_sha256: sha256,
    decoded_size: size,
    encoded_sha256: sha256,
    encoded_size: size,
    encryption_algorithm: encryptionAlgorithm,
  })
);

export const manifestEntrySchema = t.intersection([
  manifestEntryBaseSchema,
  t.exact(
    t.type({
      compression_algorithm: compressionAlgorithm,
    })
  ),
]);
export type ManifestEntrySchema = t.TypeOf<typeof manifestEntrySchema>;

export const manifestEntryDispatchSchema = t.intersection([
  manifestEntryBaseSchema,
  t.exact(
    t.type({
      compression_algorithm: compressionAlgorithmDispatch,
    })
  ),
]);

export const manifestBaseSchema = t.exact(
  t.type({
    manifest_version: semanticVersion,
    schema_version: manifestSchemaVersion,
  })
);

export const manifestSchema = t.intersection([
  manifestBaseSchema,
  t.exact(
    t.type({
      artifacts: t.record(identifier, manifestEntrySchema),
    })
  ),
]);
export type ManifestSchema = t.TypeOf<typeof manifestSchema>;

export const manifestDispatchSchema = t.intersection([
  manifestBaseSchema,
  t.exact(
    t.type({
      artifacts: t.record(identifier, manifestEntryDispatchSchema),
    })
  ),
]);
