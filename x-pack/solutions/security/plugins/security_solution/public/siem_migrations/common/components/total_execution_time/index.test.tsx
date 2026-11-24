/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TotalExecutionTime } from '.';
import { TestProviders } from '../../../../common/mock';

describe('TotalExecutionTime', () => {
  it.each([
    ['rule', 'rules'],
    ['dashboard', 'dashboards'],
    ['workflow', 'workflows'],
  ] as const)('should describe the %s items in the tooltip', (migrationType, itemTypes) => {
    const { getByText } = render(
      <TotalExecutionTime migrationType={migrationType} milliseconds={60000} />,
      { wrapper: TestProviders }
    );

    expect(
      getByText(
        `The total amount of processing and re-processing time for translating the ${itemTypes} in this migration`
      )
    ).toBeInTheDocument();
  });
});
