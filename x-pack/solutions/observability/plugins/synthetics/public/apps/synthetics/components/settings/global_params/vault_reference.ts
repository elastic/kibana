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

// Same grammar the server accepts. Only a value that is exactly one reference maps back to the form.
const VAULT_REFERENCE = /^vault:\/\/([A-Za-z0-9._-]+)@([A-Za-z0-9._/-]+)#([A-Za-z0-9._-]+)$/;

export const parseVaultReference = (value?: string): VaultReferenceParts | undefined => {
  const match = value ? VAULT_REFERENCE.exec(value) : null;
  return match ? { connection: match[1], path: match[2], field: match[3] } : undefined;
};

export const buildVaultReference = ({ connection, path, field }: VaultReferenceParts): string =>
  `vault://${connection.trim()}@${path.trim().replace(/^\/+|\/+$/g, '')}#${field.trim()}`;
