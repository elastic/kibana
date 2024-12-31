/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode, useCallback, useMemo, useState } from 'react';

import {
  aggregateValidationErrors,
  createInputFieldProps,
  createInputRangeFieldProps,
  validateInputFieldHasNotEmptyEntries,
  validateInputFieldHasNotEmptySpaces,
  validateInputFieldNotEmpty,
} from './input_fields';

interface FormState {
  name: string;
  description: string;
  metricAlias: string;
  anomalyThreshold: number;
}

type FormStateChanges = Partial<FormState>;

export const useIndicesConfigurationFormState = ({
  initialFormState = defaultFormState,
}: {
  initialFormState?: FormState;
}) => {
  const [formStateChanges, setFormStateChanges] = useState<FormStateChanges>({});

  const resetForm = useCallback(() => setFormStateChanges({}), []);

  const formState = useMemo(
    () => ({
      ...initialFormState,
      ...formStateChanges,
    }),
    [initialFormState, formStateChanges]
  );

  const nameFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: aggregateValidationErrors<string>(validateInputFieldNotEmpty)(formState.name),
        name: 'name',
        onChange: (name) => setFormStateChanges((changes) => ({ ...changes, name })),
        value: formState.name,
      }),
    [formState.name]
  );
  const metricAliasFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: aggregateValidationErrors<string>(
          validateInputFieldNotEmpty,
          validateInputFieldHasNotEmptyEntries,
          validateInputFieldHasNotEmptySpaces
        )(formState.metricAlias),
        name: 'metricAlias',
        onChange: (metricAlias) => setFormStateChanges((changes) => ({ ...changes, metricAlias })),
        value: formState.metricAlias,
      }),
    [formState.metricAlias]
  );

  const anomalyThresholdFieldProps = useMemo(
    () =>
      createInputRangeFieldProps({
        errors: aggregateValidationErrors(validateInputFieldNotEmpty)(formState.anomalyThreshold),
        name: 'anomalyThreshold',
        onChange: (anomalyThreshold) =>
          setFormStateChanges((changes) => ({ ...changes, anomalyThreshold })),
        value: formState.anomalyThreshold,
      }),
    [formState.anomalyThreshold]
  );

  const fieldProps = useMemo(
    () => ({
      name: nameFieldProps,
      metricAlias: metricAliasFieldProps,
      anomalyThreshold: anomalyThresholdFieldProps,
    }),
    [nameFieldProps, metricAliasFieldProps, anomalyThresholdFieldProps]
  );

  const errors = useMemo(
    () =>
      Object.values(fieldProps).reduce<ReactNode[]>(
        (accumulatedErrors, { error }) => [...accumulatedErrors, ...error],
        []
      ),
    [fieldProps]
  );

  const isFormValid = useMemo(() => errors.length <= 0, [errors]);

  const getUnsavedChanges = ({
    changedConfig,
    existingConfig,
  }: {
    changedConfig: FormStateChanges;
    existingConfig?: FormState;
  }) => {
    return Object.fromEntries(
      Object.entries(changedConfig).filter(([key, value]) => {
        const existingValue = existingConfig?.[key as keyof FormState];
        // don't highlight changes that were added and removed
        if (value === '' && existingValue == null) {
          return false;
        }

        return existingValue !== value;
      })
    );
  };

  return {
    errors,
    fieldProps,
    formState,
    formStateChanges,
    isFormValid,
    resetForm,
    getUnsavedChanges,
  };
};

const defaultFormState: FormState = {
  name: '',
  description: '',
  metricAlias: '',
  anomalyThreshold: 0,
};
