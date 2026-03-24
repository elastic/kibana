/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import { useTimelineConfig } from './use_timeline_config';
import { useWhichFlyout } from './use_which_flyout';
import { Flyouts } from '../constants/flyouts';
import { TimelineId } from '../../../../../common/types';
import { TimelineStatusEnum } from '../../../../../common/api/timeline';
import { pinEvent } from '../../../../timelines/store/actions';
import type { State } from '../../../../common/store';

jest.mock('./use_which_flyout');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const EVENT_ID = 'test-event-id';
const SAVED_OBJECT_ID = 'timeline-saved-object-id';

const mockGlobalStateWithSavedTimeline: State = {
  ...mockGlobalState,
  timeline: {
    ...mockGlobalState.timeline,
    timelineById: {
      ...mockGlobalState.timeline.timelineById,
      [TimelineId.active]: {
        ...mockGlobalState.timeline.timelineById[TimelineId.test],
        savedObjectId: SAVED_OBJECT_ID,
        status: TimelineStatusEnum.active,
        pinnedEventIds: {},
      },
    },
  },
};

const mockGlobalStateWithUnsavedTimeline: State = {
  ...mockGlobalState,
  timeline: {
    ...mockGlobalState.timeline,
    timelineById: {
      ...mockGlobalState.timeline.timelineById,
      [TimelineId.active]: {
        ...mockGlobalState.timeline.timelineById[TimelineId.test],
        savedObjectId: null,
        status: TimelineStatusEnum.draft,
        pinnedEventIds: {},
      },
    },
  },
};

const renderUseTimelineConfig = (
  eventId = EVENT_ID,
  store = createMockStore(mockGlobalStateWithSavedTimeline)
) =>
  renderHook(() => useTimelineConfig(eventId), {
    wrapper: ({ children }) => <TestProviders store={store}>{children}</TestProviders>,
  });

describe('useTimelineConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useWhichFlyout as jest.Mock).mockReturnValue(Flyouts.timeline);
  });

  describe('when not in the timeline flyout', () => {
    it('returns undefined when flyout is securitySolution', () => {
      (useWhichFlyout as jest.Mock).mockReturnValue(Flyouts.securitySolution);
      const { result } = renderUseTimelineConfig();
      expect(result.current).toBeUndefined();
    });

    it('returns undefined when no flyout is open', () => {
      (useWhichFlyout as jest.Mock).mockReturnValue(null);
      const { result } = renderUseTimelineConfig();
      expect(result.current).toBeUndefined();
    });
  });

  describe('when in the timeline flyout', () => {
    it('returns a config object', () => {
      const { result } = renderUseTimelineConfig();
      expect(result.current).not.toBeUndefined();
    });

    it('returns the correct timelineSavedObjectId from the store', () => {
      const { result } = renderUseTimelineConfig();
      expect(result.current?.timelineSavedObjectId).toBe(SAVED_OBJECT_ID);
    });

    it('returns isTimelineSaved true when timeline status is active', () => {
      const { result } = renderUseTimelineConfig();
      expect(result.current?.isTimelineSaved).toBe(true);
    });

    it('returns isTimelineSaved false when timeline is not saved', () => {
      const store = createMockStore(mockGlobalStateWithUnsavedTimeline);
      const { result } = renderUseTimelineConfig(EVENT_ID, store);
      expect(result.current?.isTimelineSaved).toBe(false);
    });

    it('returns attachToTimeline as true by default', () => {
      const { result } = renderUseTimelineConfig();
      expect(result.current?.attachToTimeline).toBe(true);
    });

    it('returns a setAttachToTimeline function', () => {
      const { result } = renderUseTimelineConfig();
      expect(typeof result.current?.setAttachToTimeline).toBe('function');
    });

    it('returns an attachToTimelineElement React element', () => {
      const { result } = renderUseTimelineConfig();
      expect(React.isValidElement(result.current?.attachToTimelineElement)).toBe(true);
    });

    describe('onNoteAddInTimeline', () => {
      it('dispatches pinEvent when the event is not pinned and timeline is saved', () => {
        const { result } = renderUseTimelineConfig();
        result.current?.onNoteAddInTimeline();
        expect(mockDispatch).toHaveBeenCalledWith(
          pinEvent({ id: TimelineId.active, eventId: EVENT_ID })
        );
      });

      it('does not dispatch pinEvent when the event is already pinned', () => {
        const storeWithPinnedEvent = createMockStore({
          ...mockGlobalStateWithSavedTimeline,
          timeline: {
            ...mockGlobalStateWithSavedTimeline.timeline,
            timelineById: {
              ...mockGlobalStateWithSavedTimeline.timeline.timelineById,
              [TimelineId.active]: {
                ...mockGlobalStateWithSavedTimeline.timeline.timelineById[TimelineId.active],
                pinnedEventIds: { [EVENT_ID]: true },
              },
            },
          },
        });
        const { result } = renderUseTimelineConfig(EVENT_ID, storeWithPinnedEvent);
        result.current?.onNoteAddInTimeline();
        expect(mockDispatch).not.toHaveBeenCalled();
      });

      it('does not dispatch pinEvent when timelineSavedObjectId is empty', () => {
        const store = createMockStore(mockGlobalStateWithUnsavedTimeline);
        const { result } = renderUseTimelineConfig(EVENT_ID, store);
        result.current?.onNoteAddInTimeline();
        expect(mockDispatch).not.toHaveBeenCalled();
      });

      it('does not dispatch pinEvent when eventId is empty', () => {
        const { result } = renderUseTimelineConfig('');
        result.current?.onNoteAddInTimeline();
        expect(mockDispatch).not.toHaveBeenCalled();
      });
    });
  });
});
