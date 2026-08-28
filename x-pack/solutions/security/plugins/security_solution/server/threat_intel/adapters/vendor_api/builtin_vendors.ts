/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type VendorHandler =
  | {
      kind: 'rss';
      url?: string;
    }
  | {
      kind: 'json_list';
      listPath: string;
      titleField: string;
      bodyField: string;
      idField: string;
      timestampField?: string;
      accept?: string;
    };

export const BUILTIN_VENDOR_HANDLERS: Readonly<Record<string, VendorHandler>> = Object.freeze({
  'vendor_api:elastic-security-labs': { kind: 'rss' },
});

/**
 * Resolves a built-in vendor handler by the source's catalog id. The catalog is fixed, so a
 * `vendor_api` source is always one of the seeded entries; there is no operator-supplied
 * `config.vendor` override, since custom sources are not part of MVP.
 */
export const resolveVendorHandler = (sourceId: string): VendorHandler | undefined =>
  BUILTIN_VENDOR_HANDLERS[sourceId];
