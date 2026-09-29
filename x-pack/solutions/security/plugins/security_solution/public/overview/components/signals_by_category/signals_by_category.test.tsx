/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';
import { SignalsByCategory } from './signals_by_category';

vi.mock('../../../common/components/visualization_actions/visualization_embeddable');

vi.mock('react-router-dom', () => {
  const originalModule = require('react-router-dom');
  return {
    ...originalModule,
    useLocation: vi.fn().mockReturnValue({ pathname: '' }),
  };
});

const mockUseFiltersForSignals = vi.fn(() => []);
vi.mock('./use_filters_for_signals_by_category', () => {
  const mocked = {
    useFiltersForSignalsByCategory: () => mockUseFiltersForSignals(),
  };
  return { ...mocked, default: mocked };
});

const props = {
  query: {
    query: '',
    language: 'kuery',
  },
  filters: [],
};

const renderComponent = () =>
  render(
    <TestProviders>
      <SignalsByCategory {...props} />
    </TestProviders>
  );

describe('SignalsByCategory', () => {
  it('Renders to the page', () => {
    const { getByText } = renderComponent();
    expect(getByText('Alert trend')).toBeInTheDocument();
  });
});
