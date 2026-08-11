/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldSearch } from '@elastic/eui';

export interface AddDataSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  'data-test-subj'?: string;
}

export const AddDataSearchBar = ({
  value,
  onChange,
  placeholder,
  'data-test-subj': dataTestSubj,
}: AddDataSearchBarProps) => (
  <EuiFieldSearch
    data-test-subj={dataTestSubj}
    placeholder={placeholder}
    aria-label={placeholder}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    fullWidth
  />
);
