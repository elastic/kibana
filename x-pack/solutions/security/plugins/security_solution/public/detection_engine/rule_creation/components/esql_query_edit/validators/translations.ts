/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ESQL_QUERY_VALIDATION_REQUIRED = i18n.translate(
  'xpack.securitySolution.ruleManagement.esqlValidation.requiredError',
  {
    defaultMessage: 'An ES|QL query is required.',
  }
);

export const ESQL_VALIDATION_UNKNOWN_ERROR = i18n.translate(
  'xpack.securitySolution.ruleManagement.esqlValidation.unknownError',
  {
    defaultMessage: 'Unknown error while validating ES|QL',
  }
);

export const esqlValidationErrorMessage = (message: string) =>
  i18n.translate('xpack.securitySolution.ruleManagement.esqlValidation.errorMessage', {
    values: { message },
    defaultMessage: 'Error validating ES|QL: "{message}"',
  });
