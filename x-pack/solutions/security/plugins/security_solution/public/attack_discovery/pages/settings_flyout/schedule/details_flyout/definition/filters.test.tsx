/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

import { Filters } from './filters';
import { TestProviders } from '../../../../../../common/mock';

jest.mock('../../../../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn().mockReturnValue({
    dataView: {
      getIndexPattern: () => 'logstash-*',
      fields: [{ name: '_type' }],
    },
    status: 'ready',
  }),
}));

const renderComponent = async () => {
  await act(() => {
    render(
      <TestProviders>
        {
          <Filters
            filters={[{ meta: { index: 'logstash-*' }, query: { exists: { field: '_type' } } }]}
          />
        }
      </TestProviders>
    );
  });
};

describe('Filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render filters component', async () => {
    await renderComponent();

    expect(await screen.findByTestId('filters')).toBeInTheDocument();
  });

  it('should render correct filter', async () => {
    await renderComponent();

    await waitFor(() => expect(screen.getByTestId('filters')).toHaveTextContent('_type: exists'));
  });
});
