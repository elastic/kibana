/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText } from '@elastic/eui';
import React from 'react';
import { FieldDefinition } from '@kbn/streams-plugin/common/types';
import { SchemaEditorEditingState } from '../hooks/use_editing_state';

type FieldFormFormatProps = Pick<
  SchemaEditorEditingState,
  'nextFieldType' | 'nextFieldFormat' | 'setNextFieldFormat'
>;

export const typeSupportsFormat = (type?: FieldDefinition['type']) => {
  if (!type) return false;
  return ['date'].includes(type);
};

export const FieldFormFormat = ({
  nextFieldType: fieldType,
  nextFieldFormat: value,
  setNextFieldFormat: onChange,
}: FieldFormFormatProps) => {
  if (!typeSupportsFormat(fieldType)) {
    return null;
  }
  return (
    <EuiFieldText
      data-test-subj="streamsAppFieldFormFormatField"
      placeholder="yyyy/MM/dd"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};
