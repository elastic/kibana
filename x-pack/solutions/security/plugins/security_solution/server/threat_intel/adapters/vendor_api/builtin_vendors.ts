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

export const resolveVendorHandler = (
  sourceId: string,
  configVendor: string | undefined
): VendorHandler | undefined => {
  if (configVendor && BUILTIN_VENDOR_HANDLERS[configVendor]) {
    return BUILTIN_VENDOR_HANDLERS[configVendor];
  }
  return BUILTIN_VENDOR_HANDLERS[sourceId];
};
