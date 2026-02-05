/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../common/mock/endpoint';
import { ScriptsLibraryTable, type ScriptsLibraryTableProps } from './scripts_library_table';
import { SCRIPT_TAGS } from '../../../../../../common/endpoint/service/scripts_library/constants';
import type { EndpointScript } from '../../../../../../common/endpoint/types';
import { APP_SCRIPTS_LIBRARY_PATH, SCRIPTS_LIBRARY_PATH } from '../../../../../../common/constants';
import { useUserPrivileges as _useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import { EndpointScriptsGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_scripts_generator';

jest.mock('../../../../../common/components/user_privileges');
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('ScriptsLibraryTable', () => {
  let userEve: UserEvent;
  let render: (props?: ScriptsLibraryTableProps) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let scriptsGenerator: EndpointScriptsGenerator;
  const defaultProps: ScriptsLibraryTableProps = {
    items: [],
    onChange: jest.fn(),
    queryParams: {
      page: 1,
      pageSize: 10,
      sortField: 'name',
      sortDirection: 'asc',
    },
    totalItemCount: 1,
    isLoading: false,
    searchParams: '',
    sort: {
      field: 'name',
      direction: 'asc',
    },
    'data-test-subj': 'test',
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    scriptsGenerator = new EndpointScriptsGenerator('seed');
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointAuthzInitialStateMock(),
    });
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    userEve = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);

    defaultProps.items = [
      scriptsGenerator.generate({
        id: 'script-1',
        name: 'Script One',
        tags: Object.keys(SCRIPT_TAGS) as EndpointScript['tags'],
        updatedBy: 'user2',
        updatedAt: '2026-01-13T10:15:00Z',
      }),
    ];

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
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();
      expect(renderResult.getByTestId('test-record-range-label')).toBeInTheDocument();
    });

    it('renders scripts table', () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();
      expect(renderResult.getByTestId('test')).toBeInTheDocument();
    });

    it('shows correct set of columns', () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const columns = renderResult.getAllByRole('columnheader');
      expect(columns).toHaveLength(7);
      expect(columns.map((column) => column.textContent).join(',')).toEqual(
        'Name,Platform,Tags,Updated by,Last updated,Size,Actions'
      );
    });

    it('shows error when error prop is set', () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render({ ...defaultProps, error: 'An error occurred' });

      expect(renderResult.getByText('An error occurred')).toBeInTheDocument();
    });

    it('shows `no records` are available', () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render({ ...defaultProps, items: [], totalItemCount: 0 });

      expect(renderResult.getByText('No scripts found')).toBeInTheDocument();
    });
  });

  describe('With records', () => {
    it('shows correct number of rows', () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));

      render({
        ...defaultProps,
        items: scriptsGenerator.generateListOfScripts(Array.from({ length: 11 })),
        totalItemCount: 11,
      });

      const { getByTestId } = renderResult;
      const range = getByTestId('test-record-range-label');

      expect(range).toHaveTextContent(`Showing 1-10 of 11 scripts`);
    });

    it('shows script name as link for opening details flyout', () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const { getByTestId } = renderResult;
      const nameLink = getByTestId('test-column-name-script-1');
      expect(nameLink).toHaveTextContent('Script One');
      expect(nameLink).toHaveAttribute(
        'href',
        `${APP_SCRIPTS_LIBRARY_PATH}?page=1&pageSize=10&sortField=name&sortDirection=asc&selectedScriptId=script-1&show=details`
      );
    });

    it('shows platform badges for each script', () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
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

    it('shows tags for each script', () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const { getByTestId } = renderResult;
      const tagsCell = getByTestId('test-tags');
      expect(tagsCell.textContent).toEqual('11');

      const tagsPopover = getByTestId('test-tagsDisplayPopoverButton');
      // click on tags cell and verify popover content
      userEve.click(tagsPopover).then(() => {
        expect(getByTestId('test-tagsDisplayPopoverTitle')).toHaveTextContent('Tags');
        const badges = getByTestId('test-tagsDisplayPopoverWrapper').querySelectorAll('.euiBadge');
        expect(badges).toHaveLength(11);
        // verify all tags are present and are in sorted order
        const tags = Array.from(badges).map((badge) => badge.textContent);
        expect(tags).toEqual(Object.values(SCRIPT_TAGS).sort());
      });
    });

    it('shows last updated info', () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const { getByText } = renderResult;
      expect(getByText('user2')).toBeInTheDocument();
      expect(getByText('Jan 13, 2026 @ 10:15:00.000')).toBeInTheDocument();
    });

    it('shows file size in human readable format', () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
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
      const fileSizeCell = getByTestId('test-file-size');
      expect(fileSizeCell).toHaveTextContent('784kb');
    });

    it('should sort by column `Name` when header clicked', async () => {
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const { getByText } = renderResult;
      const nameHeader = getByText('Name');

      await userEve.click(nameHeader);

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
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const { getByText } = renderResult;
      const lastUpdatedHeader = getByText('Last updated');

      await userEve.click(lastUpdatedHeader);
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
      reactTestingLibrary.act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const { getByText } = renderResult;
      const updatedByHeader = getByText('Updated by');

      await userEve.click(updatedByHeader);
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: {
            field: 'updatedBy',
            direction: 'asc',
          },
        })
      );
    });
  });
});
