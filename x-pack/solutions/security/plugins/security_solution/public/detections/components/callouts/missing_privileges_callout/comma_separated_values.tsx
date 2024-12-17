/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode } from '@elastic/eui';
import React from 'react';

interface CommaSeparatedValuesProps {
  values: React.ReactNode[];
}

export const CommaSeparatedValues = ({ values }: CommaSeparatedValuesProps) => (
  <>
    {values.map((value, i) => (
      <React.Fragment key={i}>
        <EuiCode>{value}</EuiCode>
        {i < values.length - 1 ? ', ' : ''}
      </React.Fragment>
    ))}
  </>
);
