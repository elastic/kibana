/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { useQueryTimelineById } from '../../../timelines/components/open_timeline/helpers';
import { useQueryTimelineByIdOnUrlChange } from './use_query_timeline_by_id_on_url_change';
import { renderHook } from '@testing-library/react';
import { timelineDefaults } from '../../../timelines/store/defaults';

vi.mock('../use_experimental_features');

vi.mock('../../../timelines/components/open_timeline/helpers');

const mockFlyoutTimeline = vi
  .fn()
  .mockReturnValue({ timelineDefaults, savedObjectId: 'savedObjectId_12345' });
vi.mock('../use_selector', () => {
  const mocked = {
    useShallowEqualSelector: () => mockFlyoutTimeline(),
  };
  return { ...mocked, default: mocked };
});

const mockUseLocation = vi.fn().mockReturnValue({ pathname: '/test', search: '?' });
vi.mock('react-router-dom', () => {
  const original = require('react-router-dom');
  return {
    ...original,
    useLocation: () => mockUseLocation(),
  };
});

const mockDispatch = vi.fn();
vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('queryTimelineByIdOnUrlChange', () => {
  const oldTestTimelineId = '04e8ffb0-2c2a-11ec-949c-39005af91f70';
  const newTestTimelineId = `${oldTestTimelineId}-newId`;
  const oldTimelineRisonSearchString = `?timeline=(activeTab:query,id:%27${oldTestTimelineId}%27,isOpen:!t)`;
  const newTimelineRisonSearchString = `?timeline=(activeTab:query,id:%27${newTestTimelineId}%27,isOpen:!t)`;
  const mockQueryTimelineById = vi.fn();

  beforeEach(() => {
    (useQueryTimelineById as Mock).mockImplementation(() => mockQueryTimelineById);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when an old timeline id exists, but a new id is given', () => {
    it('should call queryTimelineById', () => {
      mockUseLocation.mockReturnValue({ search: oldTimelineRisonSearchString });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      mockUseLocation.mockReturnValue({ search: newTimelineRisonSearchString });
      vi.clearAllMocks();
      rerender();

      expect(mockQueryTimelineById).toHaveBeenCalledWith(
        expect.objectContaining({
          activeTimelineTab: 'query',
          duplicate: false,
          timelineId: newTestTimelineId,
          openTimeline: true,
        })
      );
    });
  });

  // You can only redirect or run into conflict scenarios when already viewing a timeline
  describe('when not actively on a page with timeline in the search field', () => {
    it('should not call queryTimelineById', () => {
      mockFlyoutTimeline.mockReturnValue({ timelineDefaults, savedObjectId: oldTestTimelineId });

      mockUseLocation.mockReturnValue({ search: '?random=foo' });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      mockUseLocation.mockReturnValue({ search: newTimelineRisonSearchString });
      vi.clearAllMocks();
      rerender();

      expect(mockQueryTimelineById).not.toHaveBeenCalled();
    });
  });

  describe('when decode rison fails', () => {
    it('should not call queryTimelineById', () => {
      mockUseLocation.mockReturnValue({ search: oldTimelineRisonSearchString });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      mockUseLocation.mockReturnValue({ search: '?foo=bar' });

      rerender();

      expect(mockQueryTimelineById).not.toHaveBeenCalled();
    });
  });

  describe('when search string has not changed', () => {
    it('should not call queryTimelineById', () => {
      mockUseLocation.mockReturnValue({ search: oldTimelineRisonSearchString });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      vi.clearAllMocks();
      rerender();

      expect(mockQueryTimelineById).not.toHaveBeenCalled();
    });
  });

  describe('when new id is not provided', () => {
    it('should not call queryTimelineById', () => {
      mockUseLocation.mockReturnValue({ search: oldTimelineRisonSearchString });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      mockUseLocation.mockReturnValue({ search: '?timeline=(activeTab:query)' }); // no id
      vi.clearAllMocks();
      rerender();

      expect(mockQueryTimelineById).not.toHaveBeenCalled();
    });
  });

  describe('when new id matches the data in redux', () => {
    it('should not call queryTimelineById', () => {
      mockFlyoutTimeline.mockReturnValue({ timelineDefaults, savedObjectId: newTestTimelineId });
      mockUseLocation.mockReturnValue({ search: oldTimelineRisonSearchString });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      mockUseLocation.mockReturnValue({ search: newTimelineRisonSearchString });
      vi.clearAllMocks();
      rerender();

      expect(mockQueryTimelineById).not.toHaveBeenCalled();
    });
  });
});
