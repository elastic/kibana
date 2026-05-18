/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { InsightDistributionBar } from './insight_distribution_bar';
import { TestProviders } from '../../../../common/mock';

const title = 'test title';
const count = <div data-test-subj="test-count">{'100'}</div>;
const testId = 'test-id';
const stats = [
  {
    key: 'passed',
    count: 90,
    color: 'green',
  },
  {
    key: 'failed',
    count: 10,
    color: 'red',
  },
];

describe('<InsightDistributionBar />', () => {
  it('should render', () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <InsightDistributionBar title={title} stats={stats} count={count} data-test-subj={testId} />
      </TestProviders>
    );
    expect(getByTestId(testId)).toBeInTheDocument();
    expect(getByText(title)).toBeInTheDocument();
    expect(getByTestId('test-count')).toBeInTheDocument();
    expect(getByTestId(`${testId}-distribution-bar`)).toBeInTheDocument();
  });
});
