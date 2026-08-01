/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/**
 * A vault-backed param resolves its value from HashiCorp Vault at runtime,
 * inside Heartbeat. Kibana only stores this reference (path + field); it never
 * fetches or stores the plaintext secret. The effective param `value` is the
 * edge-resolved token `${vault/<path>#<field>}`.
 */
export const SyntheticsParamVaultSourceCodec = t.intersection([
  t.type({
    type: t.literal('vault'),
    path: t.string,
    field: t.string,
  }),
  t.partial({
    // Name of the Vault connection to resolve against (omit = default connection).
    connection: t.string,
  }),
]);

export type SyntheticsParamVaultSource = t.TypeOf<typeof SyntheticsParamVaultSourceCodec>;

export const SyntheticsParamsReadonlyCodec = t.intersection([
  t.interface({
    id: t.string,
    key: t.string,
  }),
  t.partial({
    description: t.string,
    tags: t.array(t.string),
    namespaces: t.array(t.string),
    source: SyntheticsParamVaultSourceCodec,
  }),
]);

export const SyntheticsParamsReadonlyCodecList = t.array(SyntheticsParamsReadonlyCodec);

export type SyntheticsParamsReadonly = t.TypeOf<typeof SyntheticsParamsReadonlyCodec>;

export const SyntheticsParamsCodec = t.intersection([
  SyntheticsParamsReadonlyCodec,
  t.interface({ value: t.string }),
]);

export type SyntheticsParams = t.TypeOf<typeof SyntheticsParamsCodec>;

export type SyntheticsParamSOAttributes = t.TypeOf<typeof SyntheticsParamsCodec>;

export const DeleteParamsResponseCodec = t.intersection([
  t.interface({
    id: t.string,
    deleted: t.boolean,
  }),
  t.partial({
    error: t.string,
  }),
]);

export type DeleteParamsResponse = t.TypeOf<typeof DeleteParamsResponseCodec>;

export const SyntheticsParamRequestCodec = t.intersection([
  t.interface({
    key: t.string,
  }),
  t.partial({
    // Either `value` (literal) or `source` (vault-backed) must be provided.
    value: t.string,
    source: SyntheticsParamVaultSourceCodec,
    description: t.string,
    tags: t.array(t.string),
    share_across_spaces: t.boolean,
  }),
]);

export type SyntheticsParamRequest = t.TypeOf<typeof SyntheticsParamRequestCodec>;
