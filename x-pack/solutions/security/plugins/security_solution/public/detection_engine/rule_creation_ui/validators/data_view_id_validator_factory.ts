/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormData, ValidationFunc } from '../../../shared_imports';

export function dataViewIdValidatorFactory(): ValidationFunc<FormData, string, unknown> {
  return (...args) => {
    const [{ path, value }] = args;

    return !isDataViewIdValid(value)
      ? {
          path,
          message: i18n.translate(
            'xpack.securitySolution.ruleManagement.ruleCreation.validation.dataView.requiredError',
            {
              defaultMessage: 'Please select an available Data View.',
            }
          ),
        }
      : undefined;
  };
}

export function isDataViewIdValid(dataViewId: unknown): dataViewId is string {
  return typeof dataViewId === 'string' && dataViewId !== '';
}
