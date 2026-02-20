/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';

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
    it('renders record range label', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();
      const { getByTestId } = renderResult;

      expect(getByTestId('test-record-range-label')).toBeInTheDocument();
    });

    it('renders scripts table', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();
      expect(renderResult.getByTestId('test')).toBeInTheDocument();
    });

    it('shows correct set of columns', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const columns = renderResult.getAllByRole('columnheader');
      expect(columns).toHaveLength(7);
      const columnLabels = columns.map((column) => column.textContent).join(',');
      expect(columnLabels).toEqual('Name,Platforms,Types,Updated by,Last updated,Size,Actions');
    });

    it('shows error when error prop is set', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render({ ...defaultProps, error: 'An error occurred' });

      expect(renderResult.getByText('An error occurred')).toBeInTheDocument();
    });

    it('shows `no records` are available', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render({ ...defaultProps, items: [], totalItemCount: 0 });

      expect(renderResult.getByText('No scripts found')).toBeInTheDocument();
    });
  });

  describe('With records', () => {
    it('shows correct number of rows', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));

      render({
        ...defaultProps,
        items: scriptsGenerator.generateListOfScripts(Array.from({ length: 11 })),
        totalItemCount: 11,
      });

      const { getByTestId } = renderResult;

      expect(getByTestId('test-record-range-label')).toHaveTextContent(
        `Showing 1-10 of 11 scripts`
      );
    });

    it('shows script name as a link for opening details flyout', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const { getByTestId } = renderResult;
      const nameButton = getByTestId('test-column-name-script-1-name-link');
      expect(nameButton).toHaveTextContent('Script One');
      expect(nameButton.tagName).toBe('A');
    });

    it('shows platform badges for each script', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
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
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
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
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const { getByText } = renderResult;
      expect(getByText('user2')).toBeInTheDocument();
      expect(getByText('Jan 13, 2026 @ 10:15:00.000')).toBeInTheDocument();
    });

    it('shows file size in human readable format', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
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

    it('should sort by column `Name` when header clicked', async () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
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
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
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
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
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
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
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

  describe('With records and row actions', () => {
    it('should trigger details flyout when script name is clicked', async () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));
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

    it('should show `delete` action with `canWriteScriptsLibrary` privilege', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: true,
        },
      });

      act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const { getByTestId } = renderResult;
      const actionsButton = getByTestId('test-row-actions-script-1-button');

      await fireEvent.click(actionsButton);

      const actionPanel = getByTestId('test-row-actions-script-1-contextMenuPanel');
      expect(actionPanel).toBeInTheDocument();

      const actionItems = actionPanel.querySelectorAll('.euiContextMenuItem');
      expect(actionItems).toHaveLength(3);
      const actionItemLabels = Array.from(actionItems).map((item) => item.textContent);
      expect(actionItemLabels).toEqual(['View details', 'Download script', 'Delete script']);
    });

    it('should not `delete` action without `canWriteScriptsLibrary` privilege', async () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: false,
        },
      });

      act(() => history.push(SCRIPTS_LIBRARY_PATH));
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
});
