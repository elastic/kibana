/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { GlobalFilter } from '../../types';
import { CountWidget, LOADING_TEST_ID, TOOLTIP_TEST_ID, VALUE_TEST_ID } from '.';
import { useFetchCountWidgetData } from './hooks';
import { fireEvent, waitFor } from '@testing-library/react';

const TITLE = 'Count Widget Title';
const GLOBAL_FILTER: GlobalFilter = {
  endDate: '2022-06-15T14:15:25.777Z',
  filterQuery: '{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}',
  startDate: '2022-05-15T14:15:25.777Z',
};

const MOCK_DATA_NORMAL = {
  pages: [12],
};

const MOCK_DATA_MILLION = {
  pages: [1210000],
};

const MOCK_DATA_THOUSAND = {
  pages: [5236],
};

const MOCK_DATA_CLOSE_TO_MILLION = {
  pages: [999999],
};

jest.mock('../../hooks/use_filter', () => ({
  useSetFilter: () => ({
    getFilterForValueButton: jest.fn(),
    getFilterOutValueButton: jest.fn(),
    filterManager: {},
  }),
}));

jest.mock('./hooks');
const mockUseFetchData = useFetchCountWidgetData as jest.Mock;

describe('CountWidget component', () => {
  let renderResult: ReturnType<typeof render>;
  const mockedContext = createAppRootMockRenderer();
  const render: () => ReturnType<AppContextTestRender['render']> = () =>
    (renderResult = mockedContext.render(
      <CountWidget
        title={TITLE}
        globalFilter={GLOBAL_FILTER}
        widgetKey="CountContainerImagesWidgets"
        groupedBy={'container.image.name'}
      />
    ));

  describe('When PercentWidget is mounted', () => {
    describe('with small amount of data (less than 1000)', () => {
      beforeEach(() => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA_NORMAL,
          isLoading: false,
        }));
      });

      it('should show title and count numbers correctly', async () => {
        render();

        expect(renderResult.getByText(TITLE)).toBeVisible();
        expect(renderResult.getByText('12')).toBeVisible();
      });
    });

    describe('with moderate amount of data (more than 1000 less than 1 million)', () => {
      beforeEach(() => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA_THOUSAND,
          isLoading: false,
        }));
      });

      it('should show title and count numbers (formatted thousands with comma)correctly', async () => {
        render();

        expect(renderResult.getByText(TITLE)).toBeVisible();
        expect(renderResult.getByText('5K')).toBeVisible();
      });
    });

    describe('with huge amount of data (more than 1 million)', () => {
      it('should show title and count numbers (formatted remove the zeroes and add M) correctly', async () => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA_MILLION,
          isLoading: false,
        }));
        render();

        expect(renderResult.getByText(TITLE)).toBeVisible();
        expect(renderResult.getByText('1.2M')).toBeVisible();
      });
    });

    describe('with huge amount of data (Very close to 1 million)', () => {
      it('should show title and count numbers (formatted remove the zeroes and add K) correctly', async () => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA_CLOSE_TO_MILLION,
          isLoading: false,
        }));
        render();

        expect(renderResult.getByText(TITLE)).toBeVisible();
        expect(renderResult.getByText('999K')).toBeVisible();
      });
    });

    describe('When data is loading', () => {
      it('should show the loading icon', async () => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA_MILLION,
          isLoading: true,
        }));
        render();

        expect(renderResult.getAllByTestId(LOADING_TEST_ID)).toHaveLength(1);
      });
    });

    describe('Testing Tooltips', () => {
      it('Tooltips show the real count value (not formatted)', async () => {
        mockUseFetchData.mockImplementation(() => ({
          data: MOCK_DATA_THOUSAND,
          isLoading: false,
        }));
        render();
        fireEvent.mouseOver(renderResult.getByTestId(VALUE_TEST_ID));
        await waitFor(() => renderResult.getByTestId(TOOLTIP_TEST_ID));
        expect(renderResult.queryByText('5,236')).toBeTruthy();
      });
    });
  });
});
