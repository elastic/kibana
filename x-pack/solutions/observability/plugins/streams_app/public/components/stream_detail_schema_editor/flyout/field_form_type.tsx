/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import React from 'react';
import { FIELD_TYPE_MAP, FieldTypeOption } from '../constants';

interface FieldFormTypeProps {
  onChange: (value: FieldTypeOption) => void;
  value?: FieldTypeOption;
}

export const FieldFormType = ({ value, onChange }: FieldFormTypeProps) => {
  return (
    <EuiSelect
      disabled={!value}
      data-test-subj="streamsAppFieldFormTypeSelect"
      hasNoInitialSelection={!value}
      onChange={(event) => {
        onChange(event.target.value as FieldTypeOption);
      }}
      value={value}
      options={Object.entries(FIELD_TYPE_MAP).map(([optionKey, optionConfig]) => ({
        text: optionConfig.label,
        value: optionKey,
      }))}
    />
  );
};
