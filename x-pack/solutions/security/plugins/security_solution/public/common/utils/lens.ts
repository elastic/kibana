/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';

const SUPPORTED_LENS_TYPES = new Set([
  KBN_FIELD_TYPES.STRING,
  KBN_FIELD_TYPES.BOOLEAN,
  KBN_FIELD_TYPES.NUMBER,
  KBN_FIELD_TYPES.IP,
]);

export const isLensSupportedType = (fieldType: string | undefined) =>
  fieldType ? SUPPORTED_LENS_TYPES.has(fieldType as KBN_FIELD_TYPES) : false;
