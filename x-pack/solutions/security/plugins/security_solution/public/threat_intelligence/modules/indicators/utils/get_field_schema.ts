/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';

/**
 * Returns datagrid field schema for field type, the same implementation as in discover
 */
export const getFieldSchema = (kbnType: string | undefined) => {
  // Default DataGrid schemas: boolean, numeric, datetime, json, currency, string
  switch (kbnType) {
    case KBN_FIELD_TYPES.IP:
    case KBN_FIELD_TYPES.GEO_SHAPE:
    case KBN_FIELD_TYPES.NUMBER:
      return 'numeric';
    case KBN_FIELD_TYPES.BOOLEAN:
      return 'boolean';
    case KBN_FIELD_TYPES.STRING:
      return 'string';
    case KBN_FIELD_TYPES.DATE:
      return 'datetime';
    default:
      return undefined;
  }
};
