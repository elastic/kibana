/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AttacksListPanel } from './attacks_list_panel';
import { useAttacksListData } from './use_attacks_list_data';
import { AttackDetailsRightPanelKey } from '../../../../../flyout/attack_details/constants/panel_keys';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../../flyout_v2/use_flyout_api.mock';

vi.mock('../../../../../common/lib/kibana');
vi.mock('../../../../../common/hooks/use_is_new_flyout_enabled');
vi.mock('../../../../../flyout_v2/use_flyout_api');
vi.mock('./use_attacks_list_data');
vi.mock('@kbn/expandable-flyout');
vi.mock('../../../../../entity_analytics/components/severity/severity_bar', () => {
      const mocked = {
      SeverityBar: () => <div data-test-subj="severity-bar" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('react-redux-v7', () => {
      const mocked = {
      ...require('react-redux-v7'),
      useStore: () => ({ getState: vi.fn(), dispatch: vi.fn(), subscribe: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useHistory: () => ({ push: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

describe('AttacksListPanel', () => {
  const mockDataView = {
    title: 'test-index-pattern',
    getIndexPattern: () => 'test-index-pattern',
  } as unknown as DataView;

  const mockOpenFlyout = vi.fn();
  const reportEvent = vi.fn();

  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    vi.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
    (useExpandableFlyoutApi as Mock).mockReturnValue({
      openFlyout: mockOpenFlyout,
    });
    (useKibana as Mock).mockReturnValue({
      services: {
        telemetry: {
          reportEvent,
        },
      },
    });
  });

  it('renders loading state correctly', () => {
    (useAttacksListData as Mock).mockReturnValue({
      items: [],
      isLoading: true,
      pageIndex: 0,
      pageSize: 10,
      total: 0,
      setPageIndex: vi.fn(),
      setPageSize: vi.fn(),
      refetch: vi.fn(),
    });

    render(<AttacksListPanel dataView={mockDataView} />);
    expect(screen.getByRole('progressbar', { name: /loading/i })).toBeInTheDocument();
  });

  it('renders table with data correctly', () => {
    const mockItems = [
      {
        id: 'attack-1',
        name: 'Attack 1',
        alertsCount: 5,
        severityCount: { critical: 2, high: 3 },
      },
      {
        id: 'attack-2',
        name: 'Attack 2',
        alertsCount: 3,
        severityCount: { low: 3 },
      },
    ];

    (useAttacksListData as Mock).mockReturnValue({
      items: mockItems,
      isLoading: false,
      pageIndex: 0,
      pageSize: 10,
      total: 2,
      setPageIndex: vi.fn(),
      setPageSize: vi.fn(),
      refetch: vi.fn(),
    });

    render(<AttacksListPanel dataView={mockDataView} />);

    expect(screen.getByText('2 attacks detected')).toBeInTheDocument();
    expect(screen.getByText('Attack 1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Attack 2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByTestId('severity-bar')).toHaveLength(2);
  });

  it('calls openFlyout (legacy) when clicking on an attack name with flag off', () => {
    const mockItems = [{ id: 'attack-1', name: 'Attack 1', alertsCount: 5, severityCount: {} }];

    (useAttacksListData as Mock).mockReturnValue({
      items: mockItems,
      isLoading: false,
      pageIndex: 0,
      pageSize: 10,
      total: 1,
      setPageIndex: vi.fn(),
      setPageSize: vi.fn(),
      refetch: vi.fn(),
    });

    render(<AttacksListPanel dataView={mockDataView} />);

    const link = screen.getByText('Attack 1');
    link.click();

    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: AttackDetailsRightPanelKey,
        params: {
          attackId: 'attack-1',
          indexName: 'test-index-pattern',
        },
      },
    });
    expect(flyoutApi.openAttackFlyout).not.toHaveBeenCalled();
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.DetailsFlyoutOpened, {
      id: 'attack-1',
      source: 'attacks_page_summary_kpi',
    });
  });

  it('calls openAttackFlyout when enableNewFlyout setting is on', () => {
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);
    const mockRefetch = vi.fn();
    const mockItems = [{ id: 'attack-1', name: 'Attack 1', alertsCount: 5, severityCount: {} }];

    (useAttacksListData as Mock).mockReturnValue({
      items: mockItems,
      isLoading: false,
      pageIndex: 0,
      pageSize: 10,
      total: 1,
      setPageIndex: vi.fn(),
      setPageSize: vi.fn(),
      refetch: mockRefetch,
    });

    render(<AttacksListPanel dataView={mockDataView} />);

    const link = screen.getByText('Attack 1');
    link.click();

    expect(flyoutApi.openAttackFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        attackId: 'attack-1',
        indexName: 'test-index-pattern',
      })
    );
    expect(mockOpenFlyout).not.toHaveBeenCalled();
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.DetailsFlyoutOpened, {
      id: 'attack-1',
      source: 'attacks_page_summary_kpi',
    });
  });

  it('handles pagination changes', () => {
    const setPageIndex = vi.fn();
    const setPageSize = vi.fn();

    (useAttacksListData as Mock).mockReturnValue({
      items: [],
      isLoading: false,
      pageIndex: 0,
      pageSize: 10,
      total: 20,
      setPageIndex,
      setPageSize,
      refetch: vi.fn(),
    });

    render(<AttacksListPanel dataView={mockDataView} />);

    // Find next page button and click it
    const nextPageButton = screen.getByLabelText('Next page');
    nextPageButton.click();

    expect(setPageIndex).toHaveBeenCalledWith(1);
  });
});
