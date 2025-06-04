/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { useMaintenanceWindows } from './use_maintenance_windows';

export interface MaintenanceWindowsFieldProps {
  fullWidth?: boolean;
  onChange: (value: string[]) => void;
  value?: string[];
  placeholder?: string;
  readOnly?: boolean;
}

export const MaintenanceWindowsField = ({
  value,
  readOnly,
  onChange,
  fullWidth,
}: MaintenanceWindowsFieldProps) => {
  const { data } = useMaintenanceWindows();
  const options: Array<EuiComboBoxOptionOption<string>> =
    data?.data?.map((option) => ({
      value: option.id,
      label: option.title,
    })) ?? [];

  return (
    <EuiComboBox<string>
      options={options}
      onChange={(newValue) => {
        onChange(newValue.map((option) => option.value as string));
      }}
      defaultValue={[]}
      selectedOptions={options.filter((option) => value?.includes(option.value as string))}
      fullWidth={fullWidth}
      isDisabled={readOnly}
    />
  );
};
