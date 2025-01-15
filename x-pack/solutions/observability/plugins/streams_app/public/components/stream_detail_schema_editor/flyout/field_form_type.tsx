/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import React from 'react';
import { SchemaEditorEditingState } from '../hooks/use_editing_state';

type FieldFormTypeProps = Pick<SchemaEditorEditingState, 'nextFieldType' | 'setNextFieldType'>;

const TYPE_OPTIONS = {
  long: 'Long',
  double: 'Double',
  keyword: 'Keyword',
  match_only_text: 'Text (match_only_text)',
  boolean: 'Boolean',
  ip: 'IP',
  date: 'Date',
} as const;

type FieldTypeOption = keyof typeof TYPE_OPTIONS;

export const FieldFormType = ({
  nextFieldType: value,
  setNextFieldType: onChange,
}: FieldFormTypeProps) => {
  return (
    <EuiSelect
      data-test-subj="streamsAppFieldFormTypeSelect"
      hasNoInitialSelection={!value}
      onChange={(event) => {
        onChange(event.target.value as FieldTypeOption);
      }}
      value={value}
      options={Object.entries(TYPE_OPTIONS).map(([optionKey, optionValue]) => ({
        text: optionValue,
        value: optionKey,
      }))}
    />
  );
};
