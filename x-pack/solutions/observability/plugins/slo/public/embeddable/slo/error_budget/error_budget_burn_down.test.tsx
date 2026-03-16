/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { render } from '../../../utils/test_helper';
import { buildSlo } from '../../../data/slo/slo';
import { SloErrorBudget } from './error_budget_burn_down';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { useFetchSloList } from '../../../hooks/use_fetch_slo_list';
import { useFetchHistoricalSummary } from '../../../hooks/use_fetch_historical_summary';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana');
jest.mock('../../../hooks/use_fetch_slo_details');
jest.mock('../../../hooks/use_fetch_slo_list');
jest.mock('../../../hooks/use_fetch_historical_summary');

const useKibanaMock = useKibana as jest.Mock;
const useFetchSloDetailsMock = useFetchSloDetails as jest.Mock;
const useFetchSloListMock = useFetchSloList as jest.Mock;
const useFetchHistoricalSummaryMock = useFetchHistoricalSummary as jest.Mock;

describe('SloErrorBudget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        executionContext: {
          get: () => ({ name: 'dashboards' }),
        },
        http: {
          basePath: {
            prepend: (url: string) => url,
          },
        },
        charts: chartPluginMock.createStartContract(),
        uiSettings: {
          get: (setting: string) => {
            if (setting === 'dateFormat') return 'YYYY-MM-DD';
            if (setting === 'format:percent:defaultPattern') return '0.0%';
            return '';
          },
        },
      },
    });
    useFetchSloListMock.mockReturnValue({ data: { results: [] } });
    useFetchHistoricalSummaryMock.mockReturnValue({ isLoading: false, data: [] });
  });

  it('renders the SLO name when data is loaded', async () => {
    const slo = buildSlo({ id: 'test-slo-id', name: 'My Test SLO' });
    useFetchSloDetailsMock.mockReturnValue({
      isLoading: false,
      isRefetching: false,
      data: slo,
      refetch: jest.fn(),
    });

    render(<SloErrorBudget sloId="test-slo-id" sloInstanceId={ALL_VALUE} />);

    await waitFor(() => {
      expect(screen.getByText('My Test SLO')).toBeTruthy();
    });
  });

  it('renders not found message when SLO does not exist', async () => {
    useFetchSloDetailsMock.mockReturnValue({
      isLoading: false,
      isRefetching: false,
      data: undefined,
      refetch: jest.fn(),
    });

    render(<SloErrorBudget sloId="non-existent-id" sloInstanceId={ALL_VALUE} />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to find SLO/)).toBeTruthy();
    });
  });

  it('renders correctly when sloInstanceId defaults to ALL_VALUE', async () => {
    const slo = buildSlo({ id: 'default-instance-slo', name: 'Default Instance SLO' });
    useFetchSloDetailsMock.mockReturnValue({
      isLoading: false,
      isRefetching: false,
      data: slo,
      refetch: jest.fn(),
    });

    render(<SloErrorBudget sloId="default-instance-slo" sloInstanceId={ALL_VALUE} />);

    await waitFor(() => {
      expect(screen.getByText('Default Instance SLO')).toBeTruthy();
    });

    expect(useFetchSloListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kqlQuery: `slo.id:"default-instance-slo" and slo.instanceId:"${ALL_VALUE}"`,
      })
    );
  });

  it('passes the correct kqlQuery with a specific sloInstanceId', async () => {
    const slo = buildSlo({
      id: 'grouped-slo',
      name: 'Grouped SLO',
      instanceId: 'instance-abc',
    });
    useFetchSloDetailsMock.mockReturnValue({
      isLoading: false,
      isRefetching: false,
      data: slo,
      refetch: jest.fn(),
    });

    render(<SloErrorBudget sloId="grouped-slo" sloInstanceId="instance-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Grouped SLO')).toBeTruthy();
    });

    expect(useFetchSloListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kqlQuery: 'slo.id:"grouped-slo" and slo.instanceId:"instance-abc"',
      })
    );
  });

  it('renders loading state', () => {
    useFetchSloDetailsMock.mockReturnValue({
      isLoading: true,
      isRefetching: false,
      data: undefined,
      refetch: jest.fn(),
    });

    render(<SloErrorBudget sloId="test-slo-id" sloInstanceId={ALL_VALUE} />);

    expect(screen.getByRole('progressbar')).toBeTruthy();
  });
});
