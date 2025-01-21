/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { type FormData, type ValidationFunc } from '../../../../../../../../../shared_imports';
import * as i18n from './translations';

export const dateMathValidator: ValidationFunc<FormData, string, string> = (data) => {
  const { path, value } = data;

  if (!dateMath.parse(value)) {
    return { code: 'ERR_DATE_MATH_INVALID', path, message: i18n.INVALID_DATE_MATH };
  }
};
