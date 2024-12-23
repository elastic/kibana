/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormElement } from './form_elements';
import { LogSourceConfigurationFormError } from './source_configuration_form_errors';
import { FormValidationError } from './validation_errors';

export const getFormRowProps = (formElement: FormElement<any, FormValidationError>) => ({
  error:
    formElement.validity.validity === 'invalid'
      ? formElement.validity.reasons.map((error) => (
          <LogSourceConfigurationFormError error={error} />
        ))
      : [],
  isInvalid: formElement.validity.validity === 'invalid',
});

export const getInputFieldProps =
  <Value extends unknown>(
    decodeInputValue: (value: string) => Value,
    encodeInputValue: (value: Value) => string
  ) =>
  (formElement: FormElement<Value, any>) => ({
    isInvalid: formElement.validity.validity === 'invalid',
    onChange: (evt: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = evt.currentTarget.value;
      formElement.updateValue(() => decodeInputValue(newValue));
    },
    value: encodeInputValue(formElement.value),
  });

export const getStringInputFieldProps = getInputFieldProps<string>(
  (value) => `${value}`,
  (value) => value
);
