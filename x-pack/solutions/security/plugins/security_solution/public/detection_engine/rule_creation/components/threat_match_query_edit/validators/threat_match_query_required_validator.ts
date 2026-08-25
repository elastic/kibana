/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { FieldValueQueryBar } from '../../../../rule_creation_ui/components/query_bar_field';
import type { FormData, ValidationFunc } from '../../../../../shared_imports';
import * as i18n from './translations';

export const threatMatchQueryRequiredValidator: ValidationFunc<
  FormData,
  string,
  FieldValueQueryBar
> = (...args) => {
  const [{ path, value }] = args;

  if (isEmpty(value.query.query as string) && isEmpty(value.filters)) {
    return {
      code: 'ERR_FIELD_MISSING',
      path,
      message: i18n.THREAT_MATCH_QUERY_REQUIRED_ERROR,
    };
  }
};
