/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';

const NO_OPTIONS_FOR_EXIST: EuiComboBoxOptionOption[] = [];

interface AutocompleteFieldExistsProps {
  placeholder: string;
  rowLabel?: string;
  'aria-label'?: string;
}

export const AutocompleteFieldExistsComponent: React.FC<AutocompleteFieldExistsProps> = ({
  placeholder,
  rowLabel,
  'aria-label': ariaLabel,
}): JSX.Element => (
  <EuiFormRow label={rowLabel} fullWidth>
    <EuiComboBox
      placeholder={placeholder}
      options={NO_OPTIONS_FOR_EXIST}
      selectedOptions={NO_OPTIONS_FOR_EXIST}
      onChange={undefined}
      isDisabled
      data-test-subj="valuesAutocompleteComboBox existsComboxBox"
      aria-label={ariaLabel}
      fullWidth
    />
  </EuiFormRow>
);

AutocompleteFieldExistsComponent.displayName = 'AutocompleteFieldExists';
