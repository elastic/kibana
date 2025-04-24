/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { Filters } from './filters';
import { useDataView } from '../../../alert_selection/use_data_view';
import { TestProviders } from '../../../../../../common/mock';
import { useSourcererDataView } from '../../../../../../sourcerer/containers';

jest.mock('../../../alert_selection/use_data_view');
jest.mock('../../../../../../sourcerer/containers');

const mockUseDataView = useDataView as jest.MockedFunction<typeof useDataView>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;

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

    mockUseDataView.mockReturnValue({
      getIndexPattern: () => 'logstash-*',
      fields: [{ name: '_type' }],
    } as unknown as jest.Mocked<ReturnType<typeof useDataView>>);
    mockUseSourcererDataView.mockReturnValue({
      sourcererDataView: {},
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useSourcererDataView>>);
  });

  it('should render filters component', async () => {
    await renderComponent();

    expect(screen.getByTestId('filters')).toBeInTheDocument();
  });
});
