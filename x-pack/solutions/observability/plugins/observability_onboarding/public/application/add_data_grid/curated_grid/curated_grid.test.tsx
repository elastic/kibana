/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { CuratedCategory } from '../types';
import { CuratedGrid } from './curated_grid';

const categories: CuratedCategory[] = [
  {
    id: 'cloud',
    label: 'Cloud',
    tiles: [
      {
        id: 'aws',
        title: 'Amazon Web Services',
        description: 'Collect logs and metrics from AWS services.',
        icon: <span />,
        'data-test-subj': 'tile-aws',
      },
    ],
  },
];

describe('CuratedGrid', () => {
  it('renders categories and tiles without any context providers', () => {
    render(<CuratedGrid categories={categories} />);
    expect(screen.getByText('Cloud')).toBeInTheDocument();
    expect(screen.getByTestId('tile-aws')).toBeInTheDocument();
  });

  it('renders the trailing children slot', () => {
    render(
      <CuratedGrid categories={categories}>
        <div data-test-subj="trailingSlot" />
      </CuratedGrid>
    );
    expect(screen.getByTestId('trailingSlot')).toBeInTheDocument();
  });
});
