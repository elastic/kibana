/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { SortFieldTimelineEnum, TimelineTypeEnum } from '../../../../../common/api/timeline';
import { SelectableTimeline, ORIGINAL_PAGE_SIZE } from '.';
import { Direction } from '../../../../../common/search_strategy';

const mockFetchAllTimeline = jest.fn();
jest.mock('../../../containers/all', () => {
  return {
    useGetAllTimeline: jest.fn(() => ({
      fetchAllTimeline: mockFetchAllTimeline,
      timelines: [],
    })),
  };
});
describe('SelectableTimeline', () => {
  const props = {
    hideUntitled: false,
    getSelectableOptions: jest.fn().mockReturnValue([]),
    onClosePopover: jest.fn(),
    onTimelineChange: jest.fn(),
    timelineType: TimelineTypeEnum.default,
  };

  describe('should render', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('timeline: render placeholder', () => {
      render(<SelectableTimeline {...props} />);
      expect(screen.getByPlaceholderText('e.g. Timeline name or description')).toBeInTheDocument();
    });

    test('timeline template: render placeholder', () => {
      render(<SelectableTimeline {...props} timelineType={TimelineTypeEnum.template} />);
      expect(
        screen.getByPlaceholderText('e.g. Timeline template name or description')
      ).toBeInTheDocument();
    });
  });

  describe('fetchAllTimeline', () => {
    const args = {
      pageInfo: {
        pageIndex: 1,
        pageSize: ORIGINAL_PAGE_SIZE,
      },
      search: '',
      sort: {
        sortField: SortFieldTimelineEnum.updated,
        sortOrder: Direction.desc,
      },
      status: null,
      onlyUserFavorite: false,
      timelineType: TimelineTypeEnum.default,
    };
    beforeAll(() => {
      render(<SelectableTimeline {...props} />);
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    test('should be called with correct args', () => {
      expect(mockFetchAllTimeline).toHaveBeenCalledWith(args);
    });
  });
});
