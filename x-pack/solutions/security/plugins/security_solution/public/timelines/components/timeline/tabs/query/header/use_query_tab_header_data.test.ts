/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TimelineTypeEnum, type TimelineType } from '../../../../../../../common/api/timeline';
import type { State } from '../../../../../../common/store';
import { useQueryTabHeaderData } from './use_query_tab_header_data';

// TimelineId.test === 'timeline-test'; use the string literal in the mock factory
// to avoid the jest.mock out-of-scope variable restriction.
const MOCK_TIMELINE_ID = 'timeline-test';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPortalNode = { mount: jest.fn() } as unknown as ReturnType<
  typeof import('react-reverse-portal').createHtmlPortalNode
>;

jest.mock('../../../../../../common/hooks/use_timeline_events_count', () => ({
  useTimelineEventsCountPortal: () => ({ portalNode: mockPortalNode }),
}));

const mockTimeline: { timelineType: TimelineType; isDataProviderVisible: boolean } = {
  timelineType: TimelineTypeEnum.default,
  isDataProviderVisible: false,
};

jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useSelector: (selector: (s: unknown) => unknown) =>
    selector({
      timeline: {
        showCallOutUnauthorizedMsg: false,
        insertTimeline: null,
        timelineById: {
          'timeline-test': mockTimeline,
        },
      },
    } as unknown as State),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useQueryTabHeaderData', () => {
  const timelineId = MOCK_TIMELINE_ID;

  beforeEach(() => {
    mockTimeline.timelineType = TimelineTypeEnum.default;
    mockTimeline.isDataProviderVisible = false;
  });

  describe('shouldShowQueryBuilder', () => {
    it('is true when isDataProviderVisible is true', () => {
      mockTimeline.isDataProviderVisible = true;
      mockTimeline.timelineType = TimelineTypeEnum.default;

      const { result } = renderHook(() => useQueryTabHeaderData(timelineId));

      expect(result.current.shouldShowQueryBuilder).toBe(true);
    });

    it('is true when timelineType is template', () => {
      mockTimeline.isDataProviderVisible = false;
      mockTimeline.timelineType = TimelineTypeEnum.template;

      const { result } = renderHook(() => useQueryTabHeaderData(timelineId));

      expect(result.current.shouldShowQueryBuilder).toBe(true);
    });

    it('is false when neither isDataProviderVisible nor template', () => {
      mockTimeline.isDataProviderVisible = false;
      mockTimeline.timelineType = TimelineTypeEnum.default;

      const { result } = renderHook(() => useQueryTabHeaderData(timelineId));

      expect(result.current.shouldShowQueryBuilder).toBe(false);
    });
  });

  describe('timelineEventsCountPortalNode', () => {
    it('returns the portal node from useTimelineEventsCountPortal', () => {
      const { result } = renderHook(() => useQueryTabHeaderData(timelineId));

      expect(result.current.timelineEventsCountPortalNode).toBe(mockPortalNode);
    });
  });
});
