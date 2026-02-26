/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../common/mock/endpoint';
import { ScriptsLibraryTable, type ScriptsLibraryTableProps } from './scripts_library_table';
import {
  SCRIPT_TAGS,
  SORTED_SCRIPT_TAGS_KEYS,
} from '../../../../../../common/endpoint/service/scripts_library/constants';
import { SCRIPTS_LIBRARY_PATH } from '../../../../../../common/constants';
import { useUserPrivileges as _useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import { EndpointScriptsGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_scripts_generator';

jest.mock('../../../../../common/components/user_privileges');
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('ScriptsLibraryTable', () => {
  let render: (props?: ScriptsLibraryTableProps) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let scriptsGenerator: EndpointScriptsGenerator;
  let defaultProps: ScriptsLibraryTableProps;

  beforeEach(() => {
    scriptsGenerator = new EndpointScriptsGenerator('seed');
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointAuthzInitialStateMock(),
    });

    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);

    defaultProps = {
      items: [
        scriptsGenerator.generate({
          id: 'script-1',
          name: 'Script One',
          tags: [...SORTED_SCRIPT_TAGS_KEYS],
          updatedBy: 'user2',
          updatedAt: '2026-01-13T10:15:00Z',
        }),
      ],
      onChange: jest.fn(),
      onClickAction: jest.fn(),
      queryParams: {
        page: 1,
        pageSize: 10,
        sortField: 'name',
        sortDirection: 'asc',
      },
      totalItemCount: 1,
      isLoading: false,
      sort: {
        field: 'name',
        direction: 'asc',
      },
      'data-test-subj': 'test',
    };

    // navigate to scripts lib. page before each test
    history.push(SCRIPTS_LIBRARY_PATH);

    render = (props?: ScriptsLibraryTableProps) => {
      renderResult = mockedContext.render(<ScriptsLibraryTable {...(props ?? defaultProps)} />);
      return renderResult;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    useUserPrivilegesMock.mockReset();
  });

  describe('Table rendering and interactions', () => {
    it('should display loading skeleton when isLoading is true', () => {
      render({ ...defaultProps, isLoading: true });

      const { getByTestId } = renderResult;
      const table = getByTestId('test');
      expect(table).toHaveClass('euiBasicTable-loading');
    });

    it('renders record range label', () => {
      render();

      expect(renderResult.getByTestId('test-record-range-label')).toHaveTextContent(
        `Showing 1-1 of 1 script`
      );
    });

    it('renders scripts table', () => {
      render();
      expect(renderResult.getByTestId('test')).toBeInTheDocument();
    });

    it('shows correct set of columns', () => {
      render();

      const columns = renderResult.getAllByRole('columnheader');
      expect(columns).toHaveLength(7);
      const columnLabels = columns.map((column) => column.textContent).join(',');
      expect(columnLabels).toEqual(
        'Name,Operating systems,Types,Updated by,Last updated,Size,Actions'
      );
    });

    it('shows error when error prop is set', () => {
      render({ ...defaultProps, error: 'An error occurred' });

      expect(renderResult.getByText('An error occurred')).toBeInTheDocument();
    });

    it('shows `no records` are available', () => {
      render({ ...defaultProps, items: [], totalItemCount: 0 });

      expect(renderResult.getByText('No scripts found')).toBeInTheDocument();
    });
  });

  describe('With records', () => {
    it('shows correct number of rows', () => {
      render({
        ...defaultProps,
        items: scriptsGenerator.generateListOfScripts(Array.from({ length: 11 })),
        totalItemCount: 11,
      });

      expect(renderResult.getByTestId('test-record-range-label')).toHaveTextContent(
        `Showing 1-10 of 11 scripts`
      );
    });

    it('sets correct data-script-id attribute on table rows', () => {
      render({
        ...defaultProps,
        items: scriptsGenerator.generateListOfScripts(
          Array.from({ length: 3 }).map((_, index) => ({ id: `script-${index + 1}` }))
        ),
        totalItemCount: 3,
        queryParams: {
          ...defaultProps.queryParams,
          pageSize: 10,
        },
      });

      const rows = renderResult.container.querySelectorAll('tbody tr');
      expect(rows.length).toEqual(3);
      rows.forEach((row, index) => {
        expect(row).toHaveAttribute('data-script-id', `script-${index + 1}`);
      });
    });

    it('shows script name as a link for opening details flyout', () => {
      render();

      const { getByTestId } = renderResult;
      const nameButton = getByTestId('test-column-name-script-1-name-link');
      expect(nameButton).toHaveTextContent('Script One');
      expect(nameButton.tagName).toBe('A');
    });

    it('shows platform badges for each script', () => {
      render({
        ...defaultProps,
        items: [
          {
            ...defaultProps.items[0],
            platform: ['windows', 'linux'],
          },
        ],
      });

      const { getByTestId } = renderResult;
      const platformBadges = getByTestId('test-platform-badges');
      const badges = platformBadges.querySelectorAll('.euiBadge');
      expect(badges).toHaveLength(2);
      badges.forEach((badge) => {
        expect(['Windows', 'Linux']).toContain(badge.textContent);
      });
    });

    it('shows Types for each script', async () => {
      render();

      const { getByTestId } = renderResult;
      const typesCell = getByTestId('test-types');
      expect(typesCell.textContent).toEqual('11');

      const typesPopover = getByTestId('test-typesDisplayPopoverButton');
      // click on types cell and verify popover content
      await act(async () => {
        await fireEvent.click(typesPopover);
      });
      expect(getByTestId('test-typesDisplayPopoverTitle')).toHaveTextContent('Types');
      const badges = getByTestId('test-typesDisplayPopoverWrapper').querySelectorAll('.euiBadge');
      expect(badges).toHaveLength(11);
      // verify all tags are present and are in sorted order
      const tags = Array.from(badges).map((badge) => badge.textContent);
      expect(tags).toEqual(Object.values(SCRIPT_TAGS).sort());
    });

    it('shows last updated info', () => {
      render();

      const { getByText } = renderResult;
      expect(getByText('user2')).toBeInTheDocument();
      expect(getByText('Jan 13, 2026 @ 10:15:00.000')).toBeInTheDocument();
    });

    it('shows file size in human readable format', () => {
      render({
        ...defaultProps,
        items: [
          {
            ...defaultProps.items[0],
            fileSize: 802816, // 784 kb
          },
        ],
      });

      const { getByTestId } = renderResult;
      const fileSizeCell = getByTestId('test-column-file-size');
      expect(fileSizeCell).toHaveTextContent('784kb');
    });

    describe('Sorting interactions', () => {
      it('should sort by column `Name` when header clicked', async () => {
        render();

        const { getByText } = renderResult;
        const nameHeader = getByText('Name');

        await fireEvent.click(nameHeader);

        expect(defaultProps.onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: {
              field: 'name',
              direction: 'desc',
            },
          })
        );
      });

      it('should sort by column `Last updated` when header clicked', async () => {
        render();

        const { getByText } = renderResult;
        const lastUpdatedHeader = getByText('Last updated');

        await fireEvent.click(lastUpdatedHeader);
        expect(defaultProps.onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: {
              field: 'updatedAt',
              direction: 'asc',
            },
          })
        );
      });

      it('should sort by column `Updated by` when header clicked', async () => {
        render();

        const { getByText } = renderResult;
        const updatedByHeader = getByText('Updated by');

        await fireEvent.click(updatedByHeader);
        expect(defaultProps.onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: {
              field: 'updatedBy',
              direction: 'asc',
            },
          })
        );
      });

      it('should sort by column `Size` when header clicked', async () => {
        render();

        const { getByText } = renderResult;
        const sizeHeader = getByText('Size');

        await fireEvent.click(sizeHeader);
        expect(defaultProps.onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: {
              field: 'fileSize',
              direction: 'asc',
            },
          })
        );
      });
    });
  });

  describe('With records and row actions', () => {
    it('should trigger details flyout when script name is clicked', async () => {
      render();

      const { getByTestId } = renderResult;
      const nameLink = getByTestId('test-column-name-script-1-name-link');

      await fireEvent.click(nameLink);

      expect(defaultProps.onClickAction).toHaveBeenCalledWith(
        expect.objectContaining({
          show: 'details',
          script: expect.objectContaining({ id: 'script-1' }),
        })
      );
    });

    it('should trigger download action when `Download script` action is clicked', async () => {
      render({
        ...defaultProps,
        items: [
          {
            ...defaultProps.items[0],
            downloadUri: '/api/endpoint/scripts/download/script-download-id',
          },
        ],
      });

      const { getByTestId } = renderResult;
      const actionsButton = getByTestId('test-row-actions-script-1-button');
      await fireEvent.click(actionsButton);

      const downloadAction = getByTestId('actionDownload');
      // should have an href with download link
      expect(downloadAction).toHaveAttribute(
        'href',
        expect.stringContaining('/api/endpoint/scripts/download/script-download-id')
      );
    });

    it('should trigger edit flyout when `Edit script` action is clicked', async () => {
      render();

      const { getByTestId } = renderResult;
      const actionsButton = getByTestId('test-row-actions-script-1-button');
      await fireEvent.click(actionsButton);

      const editAction = getByTestId('actionEdit');
      await fireEvent.click(editAction);

      expect(defaultProps.onClickAction).toHaveBeenCalledWith({
        show: 'edit',
        script: expect.objectContaining({ id: 'script-1' }),
      });
    });

    it('should trigger delete confirmation when `Delete script` action is clicked', async () => {
      render();
      const { getByTestId } = renderResult;
      const actionsButton = getByTestId('test-row-actions-script-1-button');
      await fireEvent.click(actionsButton);

      const deleteAction = getByTestId('actionDelete');
      await fireEvent.click(deleteAction);
      expect(defaultProps.onClickAction).toHaveBeenCalledWith({
        show: 'delete',
        script: expect.objectContaining({ id: 'script-1' }),
      });
    });

    it('should should show `edit` and `delete` actions with `canWriteScriptsLibrary` privilege', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: true,
        },
      });

      render();

      const { getByTestId } = renderResult;
      const actionsButton = getByTestId('test-row-actions-script-1-button');

      await fireEvent.click(actionsButton);

      const actionPanel = getByTestId('test-row-actions-script-1-contextMenuPanel');
      expect(actionPanel).toBeInTheDocument();

      const actionItems = actionPanel.querySelectorAll('.euiContextMenuItem');
      expect(actionItems).toHaveLength(4);
      const actionItemLabels = Array.from(actionItems).map((item) => item.textContent);
      expect(actionItemLabels).toEqual([
        'View details',
        'Edit script',
        'Download script',
        'Delete script',
      ]);
    });

    it('should not show `edit` and  `delete` actions without `canWriteScriptsLibrary` privilege', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: false,
        },
      });

      render();

      const { getByTestId } = renderResult;
      const actionsButton = getByTestId('test-row-actions-script-1-button');
      await fireEvent.click(actionsButton);

      const actionPanel = getByTestId('test-row-actions-script-1-contextMenuPanel');
      expect(actionPanel).toBeInTheDocument();
      const actionItems = actionPanel.querySelectorAll('.euiContextMenuItem');
      expect(actionItems).toHaveLength(2);
      const actionItemLabels = Array.from(actionItems).map((item) => item.textContent);
      expect(actionItemLabels).toEqual(['View details', 'Download script']);
    });
  });

  describe('Pagination interactions', () => {
    it('should call onChange with pagination parameters when page size changes', async () => {
      render();

      const { getByTestId } = renderResult;
      // Find the items per page dropdown in the pagination controls
      const rowsPerPageButton = getByTestId('tablePaginationPopoverButton');
      await fireEvent.click(rowsPerPageButton);

      // Select a different page size (e.g., 20)
      const pageSize20Option = getByTestId('tablePagination-20-rows');
      await fireEvent.click(pageSize20Option);

      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          page: {
            index: 0,
            size: 20,
          },
        })
      );
    });

    it('should call onChange with correct pageIndex when `next` paging button is clicked', async () => {
      render({
        ...defaultProps,
        items: scriptsGenerator.generateListOfScripts(Array.from({ length: 13 })),
        totalItemCount: 13,
        queryParams: {
          ...defaultProps.queryParams,
          pageSize: 10,
        },
      });
      expect(renderResult.getByTestId('test-record-range-label')).toHaveTextContent(
        `Showing 1-10 of 13 scripts`
      );

      const nextPageButton = renderResult.getByTestId('pagination-button-next');
      fireEvent.click(nextPageButton);

      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          page: {
            index: 1,
            size: 10,
          },
        })
      );
    });

    it('should call onChange with correct pageIndex when `previous` paging button is clicked', async () => {
      render({
        ...defaultProps,
        items: scriptsGenerator.generateListOfScripts(Array.from({ length: 13 })),
        totalItemCount: 13,
        queryParams: {
          ...defaultProps.queryParams,
          page: 2,
          pageSize: 10,
        },
      });
      expect(renderResult.getByTestId('test-record-range-label')).toHaveTextContent(
        `Showing 11-13 of 13 scripts`
      );

      const previousPageButton = renderResult.getByTestId('pagination-button-previous');
      fireEvent.click(previousPageButton);

      waitFor(() => {
        expect(defaultProps.onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            page: {
              index: 0,
              size: 10,
            },
          })
        );
      });
    });

    it('should display correct record range for last page with remaining results', () => {
      render({
        ...defaultProps,
        items: scriptsGenerator.generateListOfScripts(Array.from({ length: 3 })),
        totalItemCount: 23,
        queryParams: {
          ...defaultProps.queryParams,
          page: 3,
          pageSize: 10,
        },
      });

      expect(renderResult.getByTestId('test-record-range-label')).toHaveTextContent(
        `Showing 21-23 of 23 scripts`
      );
    });
  });

  describe('Edge cases and data variations', () => {
    it('should handle script with empty tags array', () => {
      render({
        ...defaultProps,
        items: [
          {
            ...defaultProps.items[0],
            tags: [],
          },
        ],
      });

      const typesCell = renderResult.getByTestId('test-types');
      expect(typesCell).toBeInTheDocument();
      // no badges popover
      expect(renderResult.queryByTestId('test-typesDisplayPopover')).not.toBeInTheDocument();
    });

    it('should render user avatar with initials', () => {
      render({
        ...defaultProps,
        items: [
          {
            ...defaultProps.items[0],
            updatedBy: 'endpoint_user_name',
          },
        ],
      });

      const avatar = renderResult.getByTestId('test-column-user-avatar');
      expect(avatar).toBeInTheDocument();
      // Avatar should have the name attribute set for computing initials
      expect(avatar).toHaveAttribute('aria-label', expect.stringContaining('endpoint_user_name'));
    });

    it('should display multiple tags sorted and limit with popover', async () => {
      const manyTags = Object.keys(SCRIPT_TAGS).slice(0, 5);
      render({
        ...defaultProps,
        items: [
          {
            ...defaultProps.items[0],
            // @ts-ignore
            tags: manyTags,
          },
        ],
      });

      const { getByTestId } = renderResult;
      const typesCell = getByTestId('test-types');
      expect(typesCell.textContent).toEqual('5');

      const typesPopover = getByTestId('test-typesDisplayPopoverButton');
      await fireEvent.click(typesPopover);

      const badges = getByTestId('test-typesDisplayPopoverWrapper').querySelectorAll('.euiBadge');
      expect(badges).toHaveLength(5);
    });

    it('should format large file sizes correctly', () => {
      const GB = 1024 * 1024 * 1024;
      render({
        ...defaultProps,
        items: [
          {
            ...defaultProps.items[0],
            fileSize: 2.5 * GB,
          },
        ],
      });

      const { getByTestId } = renderResult;
      const fileSizeCell = getByTestId('test-column-file-size');
      expect(fileSizeCell.textContent?.toLowerCase()).toContain('gb');
    });
  });
});
