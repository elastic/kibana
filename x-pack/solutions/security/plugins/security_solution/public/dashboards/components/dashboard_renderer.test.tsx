/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import {
  DashboardRenderer as DashboardContainerRenderer,
  type DashboardApi,
} from '@kbn/dashboard-plugin/public';

import { TestProviders } from '../../common/mock';
import { DashboardRenderer } from './dashboard_renderer';

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: jest.fn(() => <div data-test-subj="dashboardRenderer" />),
  DashboardTopNav: jest.fn(() => <span data-test-subj="dashboardTopNav" />),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useParams: jest.fn().mockReturnValue({
      detailName: '2d50f100-be6f-11ed-964a-ffa67304840e',
    }),
  };
});

describe('DashboardRenderer', () => {
  const props = {
    id: 'dashboard-savedObjectId',
    query: { query: '*', language: 'kql' },
    filters: [],
    canReadDashboard: true,
    savedObjectId: 'savedObjectId',
    timeRange: {
      from: '2025-01-21T23:00:00.000Z',
      to: '2025-04-22T11:15:11.349Z',
      fromStr: 'now-90d/d',
      toStr: 'now',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const { queryByTestId } = render(<DashboardRenderer {...props} />, { wrapper: TestProviders });
    expect(queryByTestId(`dashboardRenderer`)).toBeInTheDocument();
  });

  it('renders with correct options', async () => {
    render(<DashboardRenderer {...props} />, { wrapper: TestProviders });
    const options = await (
      DashboardContainerRenderer as unknown as jest.Mock
    ).mock.calls[0][0].getCreationOptions();
    const input = options.getInitialInput();

    expect(input).toEqual(
      expect.objectContaining({
        viewMode: 'view',
        timeRange: props.timeRange,
        query: props.query,
        filters: props.filters,
      })
    );
  });

  it('does not render when No Read Permission', () => {
    const testProps = {
      ...props,
      canReadDashboard: false,
    };
    render(<DashboardRenderer {...testProps} />, {
      wrapper: TestProviders,
    });
    expect(DashboardContainerRenderer).not.toHaveBeenCalled();
  });

  describe('dashboardContainer', () => {
    const dashboardContainer = {
      setFilters: jest.fn(),
      setQuery: jest.fn(),
      setTimeRange: jest.fn(),
    } as unknown as jest.Mocked<DashboardApi>;

    it('should initialize filters', () => {
      render(<DashboardRenderer {...{ ...props, dashboardContainer }} />, {
        wrapper: TestProviders,
      });

      expect(dashboardContainer.setFilters).toHaveBeenCalledWith(props.filters);
    });

    it('should initialize query', () => {
      render(<DashboardRenderer {...{ ...props, dashboardContainer }} />, {
        wrapper: TestProviders,
      });

      expect(dashboardContainer.setQuery).toHaveBeenCalledWith(props.query);
    });

    it('should initialize time range', () => {
      render(<DashboardRenderer {...{ ...props, dashboardContainer }} />, {
        wrapper: TestProviders,
      });

      expect(dashboardContainer.setTimeRange).toHaveBeenCalledWith({
        from: props.timeRange.from,
        to: props.timeRange.to,
      });
    });
  });
});
