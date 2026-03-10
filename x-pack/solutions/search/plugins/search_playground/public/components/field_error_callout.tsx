/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FieldError } from 'react-hook-form';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

function errorMessageFromType(type: FieldError['type']): string {
  switch (type) {
    case 'required':
      return i18n.translate('xpack.searchPlayground.formErrors.required', {
        defaultMessage: 'Required',
      });
    default:
      return i18n.translate('xpack.searchPlayground.formErrors.fallbackErrorMessage', {
        defaultMessage: 'Invalid input',
      });
  }
}

export interface FieldErrorCalloutProps {
  error: FieldError;
}

export const FieldErrorCallout = ({ error }: FieldErrorCalloutProps) => {
  return (
    <EuiCallOut
      color="danger"
      iconType="error"
      title={error.message ?? errorMessageFromType(error.type)}
      size="s"
    />
  );
};
