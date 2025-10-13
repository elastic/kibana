/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { Filters } from './filters';
import { useCreateDataView } from '../../../../../../common/hooks/use_create_data_view';
import { TestProviders } from '../../../../../../common/mock';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';

jest.mock('../../../../../../common/hooks/use_create_data_view');
jest.mock('../../../../../../common/hooks/use_experimental_features');

const mockUseCreateDataView = useCreateDataView as jest.MockedFunction<typeof useCreateDataView>;

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

    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    mockUseCreateDataView.mockReturnValue({
      dataView: {
        getIndexPattern: () => 'logstash-*',
        fields: [{ name: '_type' }],
      },
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useCreateDataView>>);
  });

  it('should render filters component', async () => {
    await renderComponent();

    expect(screen.getByTestId('filters')).toBeInTheDocument();
  });

  it('should render correct filter', async () => {
    await renderComponent();

    expect(screen.getByTestId('filters')).toHaveTextContent('_type: exists');
  });
});
