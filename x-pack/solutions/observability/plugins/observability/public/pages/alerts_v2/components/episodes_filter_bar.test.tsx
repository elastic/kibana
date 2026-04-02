/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { render } from '../../../utils/test_helper';
import { EpisodesFilterBar } from './episodes_filter_bar';

describe('EpisodesFilterBar', () => {
  const http = httpServiceMock.createStartContract();
  const onFilterChange = jest.fn();
  const onTimeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search, filters, and time picker', async () => {
    render(
      <EpisodesFilterBar
        filterState={{}}
        onFilterChange={onFilterChange}
        timeRange={{ from: 'now-15m', to: 'now' }}
        onTimeChange={onTimeChange}
        ruleOptions={[{ label: 'Rule A', value: 'rule-a' }]}
        services={{ http }}
      />
    );

    expect(screen.getByTestId('episodesFilterBar-search')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('episodesFilterBar-status-button')).toBeInTheDocument();
      expect(screen.getByTestId('episodesFilterBar-rule-button')).toBeInTheDocument();
    });
  });
});
