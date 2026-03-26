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
import { useSourcererDataView } from '../../../../../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';

jest.mock('../../../../../../common/hooks/use_create_data_view');
jest.mock('../../../../../../sourcerer/containers');
jest.mock('../../../../../../common/hooks/use_experimental_features');

const mockUseCreateDataView = useCreateDataView as jest.MockedFunction<typeof useCreateDataView>;
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

// FLAKY: https://github.com/elastic/kibana/issues/238898
// FLAKY: https://github.com/elastic/kibana/issues/238897
describe.skip('Filters', () => {
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
    mockUseSourcererDataView.mockReturnValue({
      sourcererDataView: {},
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useSourcererDataView>>);
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
