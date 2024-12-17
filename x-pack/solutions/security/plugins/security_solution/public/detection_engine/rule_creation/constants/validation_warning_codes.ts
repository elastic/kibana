/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EQL_ERROR_CODES } from '../../../common/hooks/eql/api';
import { ESQL_ERROR_CODES } from '../components/esql_query_edit';

const ESQL_FIELD_NAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.nonBlockingErrorCodes.esqlFieldName',
  {
    defaultMessage: 'ES|QL Query',
  }
);

const EQL_FIELD_NAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.nonBlockingErrorCodes.eqlFieldName',
  {
    defaultMessage: 'EQL Query',
  }
);

export const VALIDATION_WARNING_CODES = [
  ESQL_ERROR_CODES.INVALID_ESQL,
  EQL_ERROR_CODES.FAILED_REQUEST,
  EQL_ERROR_CODES.INVALID_EQL,
  EQL_ERROR_CODES.MISSING_DATA_SOURCE,
] as const;

export const VALIDATION_WARNING_CODE_FIELD_NAME_MAP: Readonly<Record<string, string>> = {
  [ESQL_ERROR_CODES.INVALID_ESQL]: ESQL_FIELD_NAME,
  [EQL_ERROR_CODES.FAILED_REQUEST]: EQL_FIELD_NAME,
  [EQL_ERROR_CODES.INVALID_EQL]: EQL_FIELD_NAME,
  [EQL_ERROR_CODES.MISSING_DATA_SOURCE]: EQL_FIELD_NAME,
};
