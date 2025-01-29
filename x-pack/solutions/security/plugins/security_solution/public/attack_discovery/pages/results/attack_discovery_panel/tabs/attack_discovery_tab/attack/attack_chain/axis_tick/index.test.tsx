/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { AxisTick } from '.';

describe('AxisTick', () => {
  it('renders the top cell', async () => {
    const { getByTestId } = render(<AxisTick />);

    const topCell = getByTestId('topCell');

    expect(topCell).toBeInTheDocument();
  });

  it('renders the bottom cell', async () => {
    const { getByTestId } = render(<AxisTick />);

    const bottomCell = getByTestId('bottomCell');

    expect(bottomCell).toBeInTheDocument();
  });
});
