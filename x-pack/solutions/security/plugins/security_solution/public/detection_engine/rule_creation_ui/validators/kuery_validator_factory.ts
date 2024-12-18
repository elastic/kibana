/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { fromKueryExpression } from '@kbn/es-query';
import type { FormData, ValidationFunc } from '../../../shared_imports';
import type { FieldValueQueryBar } from '../components/query_bar_field';

export function kueryValidatorFactory(): ValidationFunc<FormData, string, FieldValueQueryBar> {
  return (...args) => {
    const [{ path, value }] = args;

    if (isEmpty(value.query.query) || value.query.language !== 'kuery') {
      return;
    }

    try {
      fromKueryExpression(value.query.query);
    } catch (err) {
      return {
        code: 'ERR_FIELD_FORMAT',
        path,
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customQueryFieldInvalidError',
          {
            defaultMessage: 'The KQL is invalid',
          }
        ),
      };
    }
  };
}
