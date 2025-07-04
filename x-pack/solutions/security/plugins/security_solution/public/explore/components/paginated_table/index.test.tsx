/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../common/constants';

import type { SiemTables } from '.';
import { PaginatedTable } from '.';
import { getHostsColumns, mockData, rowItems, sortedHosts } from './index.mock';
import { ThemeProvider } from 'styled-components';
import { getMockTheme } from '../../../common/lib/kibana/kibana_react.mock';
import { Direction } from '../../../../common/search_strategy';
import { useQueryToggle } from '../../../common/containers/query_toggle';
jest.mock('../../../common/containers/query_toggle');

jest.mock('react', () => {
  const r = jest.requireActual('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...r, memo: (x: any) => x };
});

const mockTheme = getMockTheme({
  eui: {
    euiColorEmptyShade: '#ece',
    euiSizeL: '10px',
    euiBreakpoints: {
      s: '450px',
    },
    euiSizeM: '10px',
  },
});

describe('Paginated Table Component', () => {
  const loadPage = jest.fn();
  const updateLimitPagination = jest.fn();
  const updateActivePage = jest.fn();
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const mockSetToggle = jest.fn();
  const mockSetQuerySkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
  });

  const testProps = {
    activePage: 0,
    columns: getHostsColumns(),
    headerCount: 1,
    headerSupplement: <p>{'My test supplement.'}</p>,
    headerTitle: 'Hosts',
    headerTooltip: 'My test tooltip',
    headerUnit: 'Test Unit',
    itemsPerRow: rowItems,
    limit: 1,
    loading: false,
    loadPage,
    pageOfItems: mockData.Hosts.edges,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: true,
    totalCount: 10,
    updateActivePage,
    updateLimitPagination: (limit: number) => updateLimitPagination({ limit }),
  };

  const renderComponent = (props?: Partial<SiemTables>) => {
    return render(
      <ThemeProvider theme={mockTheme}>
        <PaginatedTable {...testProps} {...props} />
      </ThemeProvider>
    );
  };

  describe('rendering', () => {
    test('it renders the default load more table', () => {
      const { container } = renderComponent();
      expect(container).toMatchSnapshot();
    });

    test('it renders the loading panel at the beginning', () => {
      renderComponent({ headerCount: -1, loading: true, pageOfItems: [] });
      expect(screen.getByTestId('initialLoadingPanelPaginatedTable')).toBeInTheDocument();
    });

    test('it renders the over loading panel after data has been in the table', async () => {
      renderComponent({ loading: true });
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('it renders the correct amount of pages and starts at activePage: 0', () => {
      renderComponent();

      expect(screen.getByTestId('numberedPagination')).toBeInTheDocument();

      const firstButton = screen.getByTestId('pagination-button-0');
      expect(firstButton).toHaveAttribute('aria-current', 'page');
      expect(firstButton).toHaveAttribute('aria-label', 'Page 1 of 10');
    });

    test('it render popover to select new limit in table', () => {
      renderComponent({ limit: 2 });
      const popoverButton = screen.getByTestId('loadingMoreSizeRowPopover').querySelector('button');
      fireEvent.click(popoverButton!);
      expect(screen.getByTestId('loadingMorePickSizeRow')).toBeInTheDocument();
    });

    test('it will NOT render popover to select new limit in table if props itemsPerRow is empty', () => {
      renderComponent({ itemsPerRow: [], limit: 2 });
      expect(screen.queryByTestId('loadingMoreSizeRowPopover')).not.toBeInTheDocument();
    });

    test('Should display toast when user reaches end of results max', () => {
      const { container } = renderComponent({
        limit: DEFAULT_MAX_TABLE_QUERY_SIZE,
        totalCount: DEFAULT_MAX_TABLE_QUERY_SIZE * 3,
      });
      const nextButton = container.querySelector('[data-test-subj="pagination-button-next"]');
      fireEvent.click(nextButton!);
      expect(updateActivePage).not.toHaveBeenCalled();
    });

    test('Should show items per row if totalCount is greater than items', () => {
      renderComponent({
        limit: DEFAULT_MAX_TABLE_QUERY_SIZE,
        totalCount: 30,
      });
      expect(screen.getByTestId('loadingMoreSizeRowPopover')).toBeInTheDocument();
    });

    test('Should hide items per row if totalCount is less than items', () => {
      renderComponent({
        limit: DEFAULT_MAX_TABLE_QUERY_SIZE,
        totalCount: 1,
      });
      expect(screen.queryByTestId('loadingMoreSizeRowPopover')).not.toBeInTheDocument();
    });

    test('Should hide pagination if totalCount is zero', () => {
      renderComponent({
        limit: DEFAULT_MAX_TABLE_QUERY_SIZE,
        totalCount: 0,
      });
      expect(screen.queryByTestId('numberedPagination')).not.toBeInTheDocument();
    });
  });

  describe('Events', () => {
    test('should call updateActivePage with 1 when clicking to the first page', () => {
      renderComponent();
      const nextButton = screen.getByTestId('pagination-button-next');
      fireEvent.click(nextButton);
      expect(updateActivePage).toHaveBeenCalledWith(1);
    });

    test('Should call updateActivePage with 0 when you pick a new limit', async () => {
      renderComponent({ limit: 2 });
      const nextButton = screen.getByTestId('pagination-button-next');
      fireEvent.click(nextButton);

      const popoverButton = screen.getByTestId('loadingMoreSizeRowPopover').querySelector('button');
      fireEvent.click(popoverButton!);

      const pickSizeButton = screen.getByTestId('loadingMorePickSizeRow').querySelector('button');
      fireEvent.click(pickSizeButton!);

      await waitFor(() => {
        expect(updateActivePage).toHaveBeenCalledWith(0);
      });
    });

    test('should update the page when the activePage is changed from redux', async () => {
      const { rerender } = renderComponent({ activePage: 3 });
      const beforeActiveButton = screen.getByTestId('pagination-button-3');
      expect(beforeActiveButton).toHaveAttribute('aria-current', 'page');
      expect(beforeActiveButton).toHaveAttribute('aria-label', 'Page 4 of 10');

      rerender(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} activePage={0} />
        </ThemeProvider>
      );

      await waitFor(() => {
        const afterActiveButton = screen.getByTestId('pagination-button-0');
        expect(afterActiveButton).toHaveAttribute('aria-current', 'page');
        expect(afterActiveButton).toHaveAttribute('aria-label', 'Page 1 of 10');
      });
    });

    test('Should call updateLimitPagination when you pick a new limit', () => {
      renderComponent({ limit: 2 });
      const popoverButton = screen.getByTestId('loadingMoreSizeRowPopover').querySelector('button');
      fireEvent.click(popoverButton!);

      const pickSizeButton = screen.getByTestId('loadingMorePickSizeRow').querySelector('button');
      fireEvent.click(pickSizeButton!);

      expect(updateLimitPagination).toHaveBeenCalled();
    });

    test('Should call onChange when you choose a new sort in the table', () => {
      const mockOnChange = jest.fn();
      const { container } = renderComponent({
        columns: sortedHosts,
        limit: 2,
        onChange: mockOnChange,
        sorting: { direction: Direction.asc, field: 'node.host.name' },
      });

      const sortButton = container.querySelector('.euiTable thead tr th button');
      fireEvent.click(sortButton!);

      expect(mockOnChange).toHaveBeenCalledWith({
        page: undefined,
        sort: { direction: 'desc', field: 'node.host.name' },
      });
    });
  });

  describe('Toggle query', () => {
    test('toggleQuery updates toggleStatus', () => {
      renderComponent({ setQuerySkip: mockSetQuerySkip });
      const toggleButton = screen.getByTestId('query-toggle-header');
      toggleButton.click();
      expect(mockSetToggle).toHaveBeenCalledWith(false);
      expect(mockSetQuerySkip).toHaveBeenCalledWith(true);
    });

    test('toggleStatus=true, render table', () => {
      renderComponent();
      expect(screen.getByTestId('paginated-basic-table')).toBeInTheDocument();
    });

    test('toggleStatus=false, hide table', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      renderComponent();
      expect(screen.queryByTestId('paginated-basic-table')).not.toBeInTheDocument();
    });
  });
});
