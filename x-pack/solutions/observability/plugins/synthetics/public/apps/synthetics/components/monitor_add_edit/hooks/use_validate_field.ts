/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, ComponentProps } from 'react';
import { Controller, ControllerFieldState, useFormContext } from 'react-hook-form';
import { FieldMeta, FormConfig } from '../types';

export function useValidateField<TFieldKey extends keyof FormConfig>({
  fieldKey,
  validation,
  validationError,
  required,
  dependencies,
  customHook,
}: {
  fieldKey: FieldMeta<TFieldKey>['fieldKey'];
  validation: FieldMeta<TFieldKey>['validation'];
  validationError: FieldMeta<TFieldKey>['error'];
  required: boolean;
  dependencies: FieldMeta<TFieldKey>['dependencies'];
  customHook: FieldMeta<TFieldKey>['customHook'];
}) {
  const { getValues, formState, getFieldState, watch } = useFormContext<FormConfig>();
  const fieldState = getFieldState(fieldKey, formState);
  const fieldValue = getValues(fieldKey);
  const fieldError = fieldState.error;
  const isFieldTouched = fieldState.isTouched;
  const isFieldInvalid = fieldState.invalid;

  const [dependenciesFieldMeta, setDependenciesFieldMeta] = useState<
    Record<string, ControllerFieldState>
  >({});
  let dependenciesValues: unknown[] = [];

  if (dependencies) {
    dependenciesValues = watch(dependencies);
  }
  useEffect(() => {
    if (dependencies) {
      dependencies.forEach((dependency) => {
        setDependenciesFieldMeta((prevState) => ({
          ...prevState,
          [dependency]: getFieldState(dependency),
        }));
      });
    }
    // run effect when dependencies values change, to get the most up-to-date meta state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(dependenciesValues || []), dependencies, getFieldState]);

  let hookFn: Function = () => {};
  let hookProps;

  if (customHook) {
    hookProps = customHook(fieldValue);
    hookFn = hookProps.func;
  }
  const { [hookProps?.fieldKey as string]: hookResult } = hookFn(hookProps?.params) || {};
  const hookErrorContent = hookProps?.error;
  const hookError = hookResult ? hookProps?.error : undefined;

  const { validate: fieldValidator, ...fieldRules } = validation?.(dependenciesValues) ?? {};
  const validatorsWithHook = {
    validHook: () => (hookError ? hookErrorContent : true),
    ...(fieldValidator ?? {}),
  };

  const showFieldAsInvalid = isFieldInvalid && (isFieldTouched || formState.isSubmitted);

  return {
    dependenciesValues,
    dependenciesFieldMeta,
    isInvalid: showFieldAsInvalid,
    error: showFieldAsInvalid ? fieldError?.message || validationError : undefined,
    rules: {
      required,
      ...(fieldRules ?? {}),
      validate: validatorsWithHook,
    } as ComponentProps<typeof Controller>['rules'],
  };
}
