/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AttacksListPanel } from './attacks_list_panel';
import { useAttacksListData } from './use_attacks_list_data';
import { AttackDetailsRightPanelKey } from '../../../../../flyout/attack_details/constants/panel_keys';

jest.mock('./use_attacks_list_data');
jest.mock('@kbn/expandable-flyout');

describe('AttacksListPanel', () => {
  const mockDataView = {
    title: 'test-index-pattern',
    getIndexPattern: () => 'test-index-pattern',
  } as unknown as DataView;

  const mockOpenFlyout = jest.fn();

  beforeEach(() => {
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
      openFlyout: mockOpenFlyout,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    (useAttacksListData as jest.Mock).mockReturnValue({
      items: [],
      isLoading: true,
      pageIndex: 0,
      pageSize: 10,
      total: 0,
      setPageIndex: jest.fn(),
      setPageSize: jest.fn(),
    });

    render(<AttacksListPanel dataView={mockDataView} />);
    expect(screen.getByRole('progressbar', { name: /loading/i })).toBeInTheDocument();
  });

  it('renders table with data correctly', () => {
    const mockItems = [
      { id: 'attack-1', name: 'Attack 1', alertsCount: 5 },
      { id: 'attack-2', name: 'Attack 2', alertsCount: 3 },
    ];

    (useAttacksListData as jest.Mock).mockReturnValue({
      items: mockItems,
      isLoading: false,
      pageIndex: 0,
      pageSize: 10,
      total: 2,
      setPageIndex: jest.fn(),
      setPageSize: jest.fn(),
    });

    render(<AttacksListPanel dataView={mockDataView} />);

    expect(screen.getByText('2 attacks detected')).toBeInTheDocument();
    expect(screen.getByText('Attack 1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Attack 2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls openFlyout when clicking on an attack name', () => {
    const mockItems = [{ id: 'attack-1', name: 'Attack 1', alertsCount: 5 }];

    (useAttacksListData as jest.Mock).mockReturnValue({
      items: mockItems,
      isLoading: false,
      pageIndex: 0,
      pageSize: 10,
      total: 1,
      setPageIndex: jest.fn(),
      setPageSize: jest.fn(),
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
  });

  it('handles pagination changes', () => {
    const setPageIndex = jest.fn();
    const setPageSize = jest.fn();

    (useAttacksListData as jest.Mock).mockReturnValue({
      items: [],
      isLoading: false,
      pageIndex: 0,
      pageSize: 10,
      total: 20,
      setPageIndex,
      setPageSize,
    });

    render(<AttacksListPanel dataView={mockDataView} />);

    // Find next page button and click it
    const nextPageButton = screen.getByLabelText('Next page');
    nextPageButton.click();

    expect(setPageIndex).toHaveBeenCalledWith(1);
  });
});
