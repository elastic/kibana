/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldBase } from '@kbn/es-query';
import * as i18n from '../translations';

/**
 * Determines if empty value is ok
 */
export const checkEmptyValue = (
  param: string | undefined,
  field: DataViewFieldBase | undefined,
  isRequired: boolean,
  touched: boolean
): string | undefined | null => {
  if (isRequired && touched && (param == null || param.trim() === '')) {
    return i18n.FIELD_REQUIRED_ERR;
  }

  if (
    field == null ||
    (isRequired && !touched) ||
    (!isRequired && (param == null || param === ''))
  ) {
    return undefined;
  }

  return null;
};
