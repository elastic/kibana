/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ENTRY_LEADER_ENTITY_ID, CONTAINER_IMAGE_NAME } from '../../../common/constants';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { GlobalFilter } from '../../types';
import {
  ContainerNameWidget,
  LOADING_TEST_ID,
  NAME_COLUMN_TEST_ID,
  COUNT_COLUMN_TEST_ID,
  CONTAINER_NAME_TABLE_TEST_ID,
} from '.';
import { useFetchContainerNameData } from './hooks';
import { ROW_TEST_ID } from './container_name_row';

const TABLE_SORT_BUTTON_ID = 'tableHeaderSortButton';

const TITLE = 'Container image';
const GLOBAL_FILTER: GlobalFilter = {
  endDate: '2022-06-15T14:15:25.777Z',
  filterQuery: '{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}',
  startDate: '2022-05-15T14:15:25.777Z',
};
const MOCK_DATA = {
  pages: [
    {
      buckets: [
        { key: 'Container A', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container B', doc_count: 295, count_by_aggs: { value: 3 } },
        { key: 'Container C', doc_count: 295, count_by_aggs: { value: 2 } },
        { key: 'Container D', doc_count: 295, count_by_aggs: { value: 4 } },
        { key: 'Container E', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container F', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container G', doc_count: 295, count_by_aggs: { value: 0 } },
        { key: 'Container H', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container J', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container K', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container L', doc_count: 295, count_by_aggs: { value: 5 } },
      ],
      hasNextPage: true,
    },
    {
      buckets: [
        { key: 'Container A2', doc_count: 295, count_by_aggs: { value: 2 } },
        { key: 'Container B2', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container C2', doc_count: 295, count_by_aggs: { value: 6 } },
        { key: 'Container D2', doc_count: 295, count_by_aggs: { value: 1 } },
        { key: 'Container E2', doc_count: 295, count_by_aggs: { value: 3 } },
        { key: 'Container F2', doc_count: 295, count_by_aggs: { value: 1 } },
      ],
      hasNextPage: false,
    },
  ],
  pageParams: [undefined],
};
const MOCK_DATA_VIEW_ID = 'dataViewId';

jest.mock('../../hooks/use_filter', () => ({
  useSetFilter: () => ({
    getFilterForValueButton: jest.fn(),
    getFilterOutValueButton: jest.fn(),
    getCopyButton: jest.fn(),
    filterManager: {},
  }),
}));

jest.mock('./hooks');
const mockUseFetchData = useFetchContainerNameData as jest.Mock;

describe('ContainerNameWidget component', () => {
  let renderResult: ReturnType<typeof render>;
  const mockedContext = createAppRootMockRenderer();
  const render: () => ReturnType<AppContextTestRender['render']> = () =>
    (renderResult = mockedContext.render(
      <ContainerNameWidget
        widgetKey="containerNameSessions"
        globalFilter={GLOBAL_FILTER}
        groupedBy={CONTAINER_IMAGE_NAME}
        countBy={ENTRY_LEADER_ENTITY_ID}
        dataViewId={MOCK_DATA_VIEW_ID}
      />
    ));

  describe('When ContainerNameWidget is mounted', () => {
    describe('with data', () => {
      beforeEach(() => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA,
          isFetchingNextPage: true,
        }));
      });

      it('should show the table, table title, table columns, sort button', async () => {
        render();
        expect(renderResult.queryByTestId(CONTAINER_NAME_TABLE_TEST_ID)).toBeVisible();
        expect(renderResult.queryAllByTestId(TABLE_SORT_BUTTON_ID)).toHaveLength(1);
        expect(renderResult.queryAllByTestId(NAME_COLUMN_TEST_ID)).toHaveLength(17);
        expect(renderResult.queryAllByTestId(COUNT_COLUMN_TEST_ID)).toHaveLength(17);
      });

      it('should show data value names and value', async () => {
        render();
        expect(renderResult.queryAllByTestId(ROW_TEST_ID)).toHaveLength(17);
      });
    });

    describe('without data ', () => {
      it('should show no items found text', async () => {
        mockUseFetchData.mockImplementation(() => ({
          data: undefined,
          isFetchingNextPage: false,
        }));
        render();
        expect(renderResult.getByText(TITLE)).toBeVisible();
        expect(renderResult.getByText('No items found')).toBeVisible();
        expect(renderResult.getByTestId(CONTAINER_NAME_TABLE_TEST_ID)).toBeVisible();
      });
    });

    describe('when loading data', () => {
      it('should show progress bar', async () => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA,
          isFetchingNextPage: false,
          isLoading: true,
        }));
        render();
        expect(renderResult.getByTestId(LOADING_TEST_ID)).toBeVisible();
      });
    });
  });
});
