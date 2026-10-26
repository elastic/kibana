/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { appKeySchema, environmentKeySchema, timestampsSchema } from './common';

export const credentialParamsSchema = lazySchema(() =>
  z.object({
    app: appKeySchema,
    environment: environmentKeySchema,
  })
);

/** The body is optional. */
export const rotateCredentialRequestSchema = lazySchema(() =>
  z
    .object({
      rotate_client_id: z
        .boolean()
        .optional()
        .describe(
          'Also replace the client ID. Defaults to false: the client ID is public, so keeping it avoids reconfiguring browser apps.'
        ),
    })
    .nullish()
);

/** A credential as the API returns it. The SDK key itself is only returned once, by `_rotate`. */
export const credentialSchema = lazySchema(() =>
  z
    .object({
      app: appKeySchema,
      environment: environmentKeySchema,
      client_id: z.string().describe('Public identifier that browser SDKs use to evaluate flags.'),
      sdk_key_hint: z.string().describe('Last characters of the SDK key, to tell keys apart.'),
    })
    .extend(timestampsSchema.shape)
);

export const listCredentialsResponseSchema = lazySchema(() =>
  z.object({ items: z.array(credentialSchema) })
);

export const rotateCredentialResponseSchema = lazySchema(() =>
  z.object({
    credential: credentialSchema,
    sdk_key: z
      .string()
      .describe('The new SDK key. It is only returned now; Kibana stores only its SHA-256 hash.'),
  })
);

export type CredentialParams = z.infer<typeof credentialParamsSchema>;
export type RotateCredentialRequest = z.input<typeof rotateCredentialRequestSchema>;
export type Credential = z.infer<typeof credentialSchema>;
export type ListCredentialsResponse = z.infer<typeof listCredentialsResponseSchema>;
export type RotateCredentialResponse = z.infer<typeof rotateCredentialResponseSchema>;
