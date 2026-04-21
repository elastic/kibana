/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { ALL_VALUE } from '@kbn/slo-schema';
import type { FindCompositeSLOResponse, GetCompositeSLOResponse } from '@kbn/slo-schema';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { ActiveAlerts } from '../../../hooks/active_alerts';
import { useFetchActiveAlerts } from '../../../hooks/use_fetch_active_alerts';
import { useKibana } from '../../../hooks/use_kibana';
import { usePermissions } from '../../../hooks/use_permissions';
import { render } from '../../../utils/test_helper';
import { CompositeSloTable } from './composite_slo_table';

jest.mock('../../../hooks/use_kibana');
jest.mock('../../../hooks/use_permissions');
jest.mock('../../../hooks/use_fetch_active_alerts');
jest.mock('./slo_sparkline', () => ({
  SloSparkline: () => <div data-test-subj="sloSparkline" />,
}));

const useKibanaMock = useKibana as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;
const useFetchActiveAlertsMock = useFetchActiveAlerts as jest.Mock;

type CompositeSLOItem = FindCompositeSLOResponse['results'][number];

const buildCompositeSloItem = (overrides: Partial<CompositeSLOItem> = {}): CompositeSLOItem => ({
  id: 'composite-slo-1',
  name: 'My Composite SLO',
  description: 'A test composite SLO',
  compositeMethod: 'weightedAverage',
  timeWindow: { duration: '30d', type: 'rolling' },
  budgetingMethod: 'occurrences',
  objective: { target: 0.99 },
  tags: [],
  enabled: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdBy: 'user',
  updatedBy: 'user',
  version: 1,
  members: [{ sloId: 'member-slo-1', weight: 1 }],
  ...overrides,
});

const buildCompositeSloDetails = (
  overrides: Partial<GetCompositeSLOResponse> = {}
): GetCompositeSLOResponse => ({
  id: 'composite-slo-1',
  name: 'My Composite SLO',
  description: 'A test composite SLO',
  compositeMethod: 'weightedAverage',
  timeWindow: { duration: '30d', type: 'rolling' },
  budgetingMethod: 'occurrences',
  objective: { target: 0.99 },
  tags: [],
  enabled: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdBy: 'user',
  updatedBy: 'user',
  version: 1,
  summary: {
    status: 'HEALTHY',
    sliValue: 0.995,
    errorBudget: { initial: 0.01, consumed: 0.5, remaining: 0.5, isEstimated: false },
    fiveMinuteBurnRate: 1.2,
    oneHourBurnRate: 0.8,
    oneDayBurnRate: 0.6,
  },
  members: [
    {
      id: 'member-slo-1',
      name: 'Member SLO 1',
      weight: 1,
      normalisedWeight: 1,
      sliValue: 0.995,
      contribution: 0.995,
      status: 'HEALTHY',
    },
  ],
  ...overrides,
});

const defaultTableProps = {
  results: [],
  total: 0,
  page: 0,
  perPage: 25,
  sortBy: 'createdAt' as const,
  sortDirection: 'desc' as const,
  isDetailsLoading: false,
  isHistoricalLoading: false,
  detailsById: new Map<string, GetCompositeSLOResponse>(),
  historicalSummaryById: new Map(),
  onPageChange: jest.fn(),
  onPerPageChange: jest.fn(),
  onSortChange: jest.fn(),
  onDelete: jest.fn(),
};

describe('CompositeSloTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: {
        uiSettings: {
          get: (key: string) => (key === 'format:percent:defaultPattern' ? '0.0%' : ''),
        },
        application: { navigateToUrl: jest.fn() },
        http: { basePath: { prepend: (url: string) => url } },
        share: {
          url: {
            locators: {
              get: () => ({ getRedirectUrl: jest.fn().mockReturnValue('/slos') }),
            },
          },
        },
      },
    });

    usePermissionsMock.mockReturnValue({ data: { hasAllWriteRequested: true } });
    useFetchActiveAlertsMock.mockReturnValue({ data: new ActiveAlerts() });
  });

  it('shows "No composite SLOs found" when there are no items', () => {
    render(<CompositeSloTable {...defaultTableProps} />);
    expect(screen.getByText('No composite SLOs found')).toBeInTheDocument();
  });

  it('renders a row for each composite SLO', () => {
    const items = [
      buildCompositeSloItem({ id: 'composite-1', name: 'First Composite' }),
      buildCompositeSloItem({ id: 'composite-2', name: 'Second Composite' }),
    ];
    render(<CompositeSloTable {...defaultTableProps} results={items} total={2} />);

    expect(screen.getByText('First Composite')).toBeInTheDocument();
    expect(screen.getByText('Second Composite')).toBeInTheDocument();
  });

  describe('burn rate column', () => {
    it('shows "Burn rate (5m)" in the column header by default', () => {
      const item = buildCompositeSloItem();
      const details = buildCompositeSloDetails();

      render(
        <CompositeSloTable
          {...defaultTableProps}
          results={[item]}
          total={1}
          detailsById={new Map([['composite-slo-1', details]])}
        />
      );

      expect(screen.getByText('Burn rate (5m)')).toBeInTheDocument();
    });

    it('displays the 5m burn rate value by default', () => {
      const item = buildCompositeSloItem();
      const details = buildCompositeSloDetails();

      render(
        <CompositeSloTable
          {...defaultTableProps}
          results={[item]}
          total={1}
          detailsById={new Map([['composite-slo-1', details]])}
        />
      );

      expect(screen.getByText('1.2x')).toBeInTheDocument();
    });

    it('switches to 1h burn rate when selected from the popover', async () => {
      const item = buildCompositeSloItem();
      const details = buildCompositeSloDetails();

      render(
        <CompositeSloTable
          {...defaultTableProps}
          results={[item]}
          total={1}
          detailsById={new Map([['composite-slo-1', details]])}
        />
      );

      fireEvent.click(screen.getByText('Burn rate (5m)'));
      await waitForEuiPopoverOpen();
      fireEvent.click(screen.getByText('1h'));

      expect(screen.getByText('Burn rate (1h)')).toBeInTheDocument();
      expect(screen.getByText('0.8x')).toBeInTheDocument();
    });

    it('switches to 1d burn rate when selected from the popover', async () => {
      const item = buildCompositeSloItem();
      const details = buildCompositeSloDetails();

      render(
        <CompositeSloTable
          {...defaultTableProps}
          results={[item]}
          total={1}
          detailsById={new Map([['composite-slo-1', details]])}
        />
      );

      fireEvent.click(screen.getByText('Burn rate (5m)'));
      await waitForEuiPopoverOpen();
      fireEvent.click(screen.getByText('1d'));

      expect(screen.getByText('Burn rate (1d)')).toBeInTheDocument();
      expect(screen.getByText('0.6x')).toBeInTheDocument();
    });

    it('shows N/A for burn rate when status is NO_DATA', () => {
      const item = buildCompositeSloItem();
      const details = buildCompositeSloDetails({
        summary: {
          status: 'NO_DATA',
          sliValue: -1,
          errorBudget: { initial: 0.01, consumed: 0, remaining: 1, isEstimated: false },
          fiveMinuteBurnRate: 0,
          oneHourBurnRate: 0,
          oneDayBurnRate: 0,
        },
      });

      render(
        <CompositeSloTable
          {...defaultTableProps}
          results={[item]}
          total={1}
          detailsById={new Map([['composite-slo-1', details]])}
        />
      );

      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });

  describe('active alerts column', () => {
    it('does not show an alert badge when there are no active alerts', () => {
      const item = buildCompositeSloItem();
      render(<CompositeSloTable {...defaultTableProps} results={[item]} total={1} />);
      expect(screen.queryByLabelText('active alerts badge')).not.toBeInTheDocument();
    });

    it('shows an alert badge with the aggregated count across member SLOs', () => {
      const item = buildCompositeSloItem({
        members: [
          { sloId: 'member-slo-1', weight: 1 },
          { sloId: 'member-slo-2', weight: 1 },
        ],
      });

      useFetchActiveAlertsMock.mockReturnValue({
        data: new ActiveAlerts([
          [{ id: 'member-slo-1', instanceId: ALL_VALUE }, 2],
          [{ id: 'member-slo-2', instanceId: ALL_VALUE }, 3],
        ]),
      });

      render(<CompositeSloTable {...defaultTableProps} results={[item]} total={1} />);

      expect(screen.getByLabelText('active alerts badge')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});
