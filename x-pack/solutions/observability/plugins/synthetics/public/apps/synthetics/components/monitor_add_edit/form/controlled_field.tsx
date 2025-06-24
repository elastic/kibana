/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { EuiFormRow, EuiFormRowProps } from '@elastic/eui';
import { useSelector } from 'react-redux';
import useDebounce from 'react-use/lib/useDebounce';
import { ControllerRenderProps, ControllerFieldState, useFormContext } from 'react-hook-form';
import { useKibanaSpace, useIsEditFlow } from '../hooks';
import { selectServiceLocationsState } from '../../../state';
import { FieldMeta, FormConfig } from '../types';

type Props<TFieldKey extends keyof FormConfig = any> = FieldMeta<TFieldKey> & {
  component: React.ComponentType<any>;
  field: ControllerRenderProps<FormConfig, TFieldKey>;
  fieldState: ControllerFieldState;
  formRowProps: Partial<EuiFormRowProps>;
  error: React.ReactNode;
  dependenciesValues: unknown[];
  dependenciesFieldMeta: Record<string, ControllerFieldState>;
  isInvalid: boolean;
};

export const ControlledField = <TFieldKey extends keyof FormConfig>({
  component: FieldComponent,
  props,
  fieldKey,
  field,
  formRowProps,
  error,
  dependenciesValues,
  dependenciesFieldMeta,
  isInvalid,
}: Props<TFieldKey>) => {
  const { setValue, getFieldState, reset, formState, trigger } = useFormContext<FormConfig>();

  const { locations } = useSelector(selectServiceLocationsState);
  const { space } = useKibanaSpace();
  const isEdit = useIsEditFlow();

  const [onChangeArgs, setOnChangeArgs] = useState<Parameters<typeof field.onChange> | undefined>(
    undefined
  );

  useDebounce(
    async () => {
      if (onChangeArgs !== undefined) {
        await trigger?.(); // Manually invalidate whole form to make dependency validations reactive
      }
    },
    500,
    [onChangeArgs]
  );

  const handleChange = useCallback(
    async (...event: any[]) => {
      if (typeof event?.[0] === 'string' && !getFieldState(fieldKey).isTouched) {
        // This is needed for composite fields like code editors
        setValue(fieldKey, event[0], { shouldTouch: true });
      }

      field.onChange(...event);
      setOnChangeArgs(event);
    },
    // Do not depend on `field`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setOnChangeArgs]
  );

  const generatedProps = props
    ? props({
        field,
        setValue,
        trigger,
        reset,
        locations: locations.map((location) => ({ ...location, key: location.id })),
        dependencies: dependenciesValues,
        dependenciesFieldMeta,
        space: space?.id,
        isEdit,
        formState,
      })
    : {};

  return (
    <EuiFormRow {...formRowProps} isInvalid={isInvalid} error={error}>
      <FieldComponent
        {...field}
        checked={field.value || false}
        defaultValue={field.value}
        onChange={handleChange}
        {...generatedProps}
        isInvalid={isInvalid}
        fullWidth
      />
    </EuiFormRow>
  );
};
