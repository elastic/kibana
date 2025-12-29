/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ResetFilters, RESET_FILTERS_DATA_TEST_ID } from './reset_filters';

describe('ResetFilters', () => {
  test('renders correctly', () => {
    const { getByTestId } = render(<ResetFilters />);
    expect(getByTestId(RESET_FILTERS_DATA_TEST_ID)).toBeInTheDocument();
  });
});
