/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

/**
 * A vault-backed param resolves its value from HashiCorp Vault at runtime, inside
 * Heartbeat. Kibana only stores this reference; it never fetches the plaintext.
 */
export const SyntheticsParamVaultSourceCodec = lazySchema(() =>
  z.looseObject({
    type: z.literal('vault'),
    path: z.string(),
    field: z.string(),
    // Name of the Vault connection to resolve against; always set by the routes.
    connection: z.string().optional(),
  })
);

export const SyntheticsParamsReadonlyCodec = lazySchema(() =>
  z.looseObject({
    id: z.string(),
    key: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    namespaces: z.array(z.string()).optional(),
    source: SyntheticsParamVaultSourceCodec.optional(),
  })
);

export const SyntheticsParamsReadonlyCodecList = lazySchema(() =>
  z.array(SyntheticsParamsReadonlyCodec)
);

export const SyntheticsParamsCodec = lazySchema(() =>
  SyntheticsParamsReadonlyCodec.extend({
    value: z.string(),
  })
);

export const DeleteParamsResponseCodec = lazySchema(() =>
  z.looseObject({
    id: z.string(),
    deleted: z.boolean(),
    error: z.string().optional(),
  })
);

export const SyntheticsParamRequestCodec = lazySchema(() =>
  z.looseObject({
    key: z.string(),
    // Either `value` (literal) or `source` (vault-backed) must be provided.
    value: z.string().optional(),
    source: SyntheticsParamVaultSourceCodec.optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    share_across_spaces: z.boolean().optional(),
  })
);
