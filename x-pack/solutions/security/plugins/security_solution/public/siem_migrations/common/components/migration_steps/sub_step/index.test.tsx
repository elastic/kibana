/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SubSteps } from '.';

const steps = [
  {
    title: 'Step 1',
    children: 'Step 1 content',
  },
  {
    title: 'Step 2',
    children: 'Step 2 content',
  },
];

describe('SubSteps', () => {
  it('renders sub steps component', () => {
    const { getByTestId } = render(<SubSteps steps={steps} />);
    expect(getByTestId('migrationsSubSteps')).toBeInTheDocument();
  });

  it('renders the steps', () => {
    const { getByText } = render(<SubSteps steps={steps} />);
    expect(getByText('Step 1 content')).toBeInTheDocument();
    expect(getByText('Step 2 content')).toBeInTheDocument();
  });
});
