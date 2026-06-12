/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import type { RuleType } from '@kbn/securitysolution-rules';
import type { FormData, ValidationFunc } from '../../../shared_imports';
import { isEqlRule, isEsqlRule } from '../../../../common/detection_engine/utils';
import type { FieldValueQueryBar } from '../components/query_bar_field';

const EQL_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.eqlQueryFieldRequiredError',
  {
    defaultMessage: 'An EQL query is required.',
  }
);

const ESQL_REQUIRED = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleCreation.validation.query.esqlQueryFieldRequiredError',
  {
    defaultMessage: 'An ES|QL query is required.',
  }
);

const CUSTOM_QUERY_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customQueryFieldRequiredError',
  {
    defaultMessage: 'A custom query is required.',
  }
);

export function queryRequiredValidatorFactory(
  ruleType: RuleType
): ValidationFunc<FormData, string, FieldValueQueryBar> {
  return (...args) => {
    const [{ path, value }] = args;
    const validationError = {
      code: 'ERR_FIELD_MISSING',
      path,
    };

    if (!isEmpty(value.query.query as string)) {
      return;
    }

    if (isEqlRule(ruleType)) {
      return {
        ...validationError,
        message: EQL_REQUIRED,
      };
    }

    if (isEsqlRule(ruleType)) {
      return {
        ...validationError,
        message: ESQL_REQUIRED,
      };
    }

    if (isEmpty(value.filters)) {
      return {
        ...validationError,
        message: CUSTOM_QUERY_REQUIRED,
      };
    }
  };
}
