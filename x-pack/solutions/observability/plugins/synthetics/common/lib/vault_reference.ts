/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface VaultReferenceParts {
  connection: string;
  path: string;
  field: string;
}

const VAULT_PREFIX = 'vault://';

// The strict grammar a Vault reference must follow. The server validates with it and the
// global param form maps a value back to its parts with it, so the two cannot drift.
const NAME = '[A-Za-z0-9._-]+';
const PATH = '[A-Za-z0-9._/-]+';
const FIELD = '[A-Za-z0-9._-]+';

const trimSlashes = (path: string): string => path.trim().replace(/^\/+|\/+$/g, '');

export const SECRET_CONNECTION_NAME_REGEX = new RegExp(`^${NAME}$`);

/** Matches the part after `vault://`. The connection is optional; callers decide if it is required. */
export const VAULT_REFERENCE_CONTENT_REGEX = new RegExp(`^(?:(${NAME})@)?(${PATH})#(${FIELD})$`);

const PATH_REGEX = new RegExp(`^${PATH}$`);
const FIELD_REGEX = new RegExp(`^${FIELD}$`);

/** Whether the path, as `buildVaultReference` will write it, stays inside the reference grammar. */
export const isValidVaultPath = (path: string): boolean => PATH_REGEX.test(trimSlashes(path));

export const isValidVaultField = (field: string): boolean => FIELD_REGEX.test(field.trim());

/** Only a value that is exactly one reference with a connection maps back to the form. */
export const parseVaultReference = (value?: string): VaultReferenceParts | undefined => {
  if (!value?.startsWith(VAULT_PREFIX)) return undefined;
  const match = VAULT_REFERENCE_CONTENT_REGEX.exec(value.slice(VAULT_PREFIX.length));
  return match?.[1] ? { connection: match[1], path: match[2], field: match[3] } : undefined;
};

export const buildVaultReference = ({ connection, path, field }: VaultReferenceParts): string =>
  `${VAULT_PREFIX}${connection.trim()}@${trimSlashes(path)}#${field.trim()}`;
