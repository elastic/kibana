/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { FieldValue } from './convert_results';
import { isFieldValue } from './convert_results';

export interface FieldValueCellProps {
  value: FieldValue | string | number | boolean | null;
}

export const FieldValueCell: React.FC<FieldValueCellProps> = ({ value }) => {
  if (isFieldValue(value)) {
    if (value.snippet) {
      return <span>{JSON.stringify(value.snippet)}</span>;
    }
    return (
      <FieldValueCell value={value.raw as Exclude<FieldValueCellProps['value'], FieldValue>} />
    );
  }
  if (typeof value === 'string') {
    return <span>{value}</span>;
  }

  return <span>{JSON.stringify(value)}</span>;
};
