/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiPanel } from '@elastic/eui';
import { PillPopover } from './pill_popover';

export const ListPill = ({
  ariaLabel,
  emptyLabel,
  placeholder,
  values,
  onChange,
  testSubject,
}: {
  ariaLabel: string;
  emptyLabel: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  testSubject: string;
}) => (
  <PillPopover
    ariaLabel={ariaLabel}
    label={values.join(', ') || emptyLabel}
    testSubject={testSubject}
  >
    {() => (
      <EuiPanel paddingSize="s" hasShadow={false} color="transparent" css={{ width: 300 }}>
        <EuiComboBox
          compressed
          noSuggestions
          autoFocus
          aria-label={ariaLabel}
          placeholder={placeholder}
          selectedOptions={values.map((value) => ({ label: value }))}
          onCreateOption={(value) => onChange([...new Set([...values, value.trim()])])}
          onChange={(options) => onChange(options.map(({ label }) => label))}
          data-test-subj={`${testSubject}Input`}
        />
      </EuiPanel>
    )}
  </PillPopover>
);
