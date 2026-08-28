/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';

import { Filters } from './filters';
import { useDataView } from '../../../../../../data_view_manager/hooks/use_data_view';
import { TestProviders } from '../../../../../../common/mock';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';

jest.mock('../../../../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../../../../common/hooks/use_experimental_features');

// The filter badge is a lazily-loaded, Suspense-wrapped component from
// `@kbn/unified-search-plugin`. Its first cold render (on-demand module
// transform plus Suspense resolution) is costly enough to exceed the default
// 5s test budget under CI's parallel load, which is what made this test flaky.
// Give the render headroom rather than waiting the slowness out.
jest.setTimeout(60_000);

const mockUseDataView = useDataView as jest.MockedFunction<typeof useDataView>;

const renderComponent = async () => {
  // `act(async ...)` so the lazily-loaded filter badge finishes resolving
  // before we assert, instead of leaving pending Suspense work behind.
  await act(async () => {
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
    mockUseDataView.mockReturnValue({
      dataView: stubDataView,
      status: 'ready',
    } as unknown as ReturnType<typeof useDataView>);
  });

  it('should render filters component', async () => {
    await renderComponent();

    expect(screen.getByTestId('filters')).toBeInTheDocument();
  });

  it('should render correct filter', async () => {
    await renderComponent();

    // The badge label resolves after the lazy filter component loads, so wait
    // on that rendered text (the terminal signal) rather than asserting once.
    await waitFor(() => {
      expect(screen.getByTestId('filters')).toHaveTextContent('_type: exists');
    });
  });
});
