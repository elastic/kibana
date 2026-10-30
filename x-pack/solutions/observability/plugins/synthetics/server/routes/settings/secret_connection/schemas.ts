/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { validateVaultAddress } from './address_guard';
import { SECRET_CONNECTION_NAME_REGEX } from '../../../../common/lib/vault_reference';

// Upper bound for any single connection string; these flow into SO docs and the
// delivered policy blob, so keep them bounded (AGENTS.md).
export const MAX_LEN = 2048;

// HashiCorp Vault provider request shapes. Adding a provider means adding its
// config/secrets schema and turning `type`/`config`/`secrets` into a discriminated
// `schema.oneOf` keyed on `type`.
export const HashiCorpVaultConfigSchema = schema.object({
  address: schema.string({ minLength: 1, maxLength: MAX_LEN, validate: validateVaultAddress }),
  authMethod: schema.oneOf([schema.literal('token'), schema.literal('approle')]),
  namespace: schema.maybe(schema.string({ maxLength: MAX_LEN })),
  kvMount: schema.maybe(schema.string({ maxLength: MAX_LEN })),
  tlsSkipVerify: schema.maybe(schema.boolean()),
  roleId: schema.maybe(schema.string({ maxLength: MAX_LEN })),
});

export const HashiCorpVaultSecretsSchema = schema.object({
  token: schema.maybe(schema.string({ maxLength: MAX_LEN })),
  secretId: schema.maybe(schema.string({ maxLength: MAX_LEN })),
});

export const SaveBodySchema = schema.object({
  name: schema.string({
    minLength: 1,
    maxLength: MAX_LEN,
    validate: (v) =>
      SECRET_CONNECTION_NAME_REGEX.test(v)
        ? undefined
        : 'must contain only letters, numbers, and . _ -',
  }),
  type: schema.maybe(schema.literal('hashicorp_vault')),
  config: HashiCorpVaultConfigSchema,
  secrets: schema.maybe(HashiCorpVaultSecretsSchema),
});

export type SaveBody = TypeOf<typeof SaveBodySchema>;

export const TestBodySchema = schema.object({
  // When editing a saved connection with the secret left blank, `name` lets the
  // server fall back to the stored secret so Test works without re-entry.
  name: schema.maybe(schema.string({ maxLength: MAX_LEN })),
  type: schema.maybe(schema.literal('hashicorp_vault')),
  config: HashiCorpVaultConfigSchema,
  secrets: schema.maybe(HashiCorpVaultSecretsSchema),
});

export type TestBody = TypeOf<typeof TestBodySchema>;
