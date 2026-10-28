/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { PageLoadsChart } from './page_loads_chart';

const renderChart = (props: Pick<Parameters<typeof PageLoadsChart>[0], 'points' | 'isLoading'>) =>
  render(<PageLoadsChart {...props} onTimeRangeSelect={jest.fn()} />, { wrapper: EuiProvider });

jest.mock('../../../hooks/use_kibana_services');

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('PageLoadsChart', () => {
  it('says when there are no page loads', () => {
    renderChart({ points: [{ timestamp: 0, count: 0 }], isLoading: false });

    expect(screen.getByText('No page loads in the selected time range')).toBeInTheDocument();
  });

  it('shows the loading state, not the empty message, while loading', () => {
    renderChart({ points: [], isLoading: true });

    expect(screen.queryByText('No page loads in the selected time range')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
