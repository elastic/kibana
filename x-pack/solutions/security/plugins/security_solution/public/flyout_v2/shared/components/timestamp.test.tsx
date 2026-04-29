/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Timestamp } from './timestamp';
import { TIMESTAMP_TEST_ID } from './test_ids';
import { TestProviders } from '../../../common/mock';

describe('<Timestamp />', () => {
  it('should render the formatted date', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Timestamp date="2024-01-15T10:30:00.000Z" />
      </TestProviders>
    );

    expect(getByTestId(TIMESTAMP_TEST_ID)).toHaveTextContent('Jan 15, 2024 @ 10:30:00.000');
  });

  it('should render nothing when date is absent', () => {
    const { container } = render(
      <TestProviders>
        <Timestamp />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when date is an empty string', () => {
    const { container } = render(
      <TestProviders>
        <Timestamp date="" />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
