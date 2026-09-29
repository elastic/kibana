/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { createMockStore, kibanaMock, mockGlobalState } from '../../../common/mock';
import { selectTimelineById } from '../selectors';
import { TimelineId } from '../../../../common/types/timeline';
import { persistPinnedEvent } from '../../containers/pinned_event/api';
import { refreshTimelines, ensureTimelineIsSaved } from './helpers';
import {
  startTimelineSaving,
  endTimelineSaving,
  pinEvent,
  unPinEvent,
  showCallOutUnauthorizedMsg,
} from '../actions';

vi.mock('../actions', async () => {
  const actual = await vi.importActual('../actions');
  const endTLSaving = vi.fn((...args) => actual.endTimelineSaving(...args));
  (endTLSaving as unknown as { match: Function }).match = () => false;
  return {
    ...actual,
    showCallOutUnauthorizedMsg: vi
      .fn()
      .mockImplementation((...args) => actual.showCallOutUnauthorizedMsg(...args)),
    startTimelineSaving: vi
      .fn()
      .mockImplementation((...args) => actual.startTimelineSaving(...args)),
    endTimelineSaving: endTLSaving,
  };
});
vi.mock('../../containers/pinned_event/api');
const mockTimelineSavedObjectId = 'mockTimelineSavedObjectId';
vi.mock('./helpers', async () => {
  const actual = await vi.importActual('./helpers');
  return {
    ...actual,
    ensureTimelineIsSaved: vi.fn().mockImplementation(() => ({
      ...mockGlobalState.timeline.timelineById['timeline-test'],
      savedObjectId: mockTimelineSavedObjectId,
    })),
    refreshTimelines: vi.fn(),
  };
});

const startTimelineSavingMock = startTimelineSaving as unknown as Mock;
const endTimelineSavingMock = endTimelineSaving as unknown as Mock;
const showCallOutUnauthorizedMsgMock = showCallOutUnauthorizedMsg as unknown as Mock;
const ensureTimelineIsSavedMock = ensureTimelineIsSaved as unknown as Mock;

describe('Timeline pinned event middleware', () => {
  let store = createMockStore(undefined, undefined, kibanaMock);
  const testEventId = 'test';

  beforeEach(() => {
    store = createMockStore(undefined, undefined, kibanaMock);
    vi.clearAllMocks();
  });

  it('should persist a timeline pin event action', async () => {
    (persistPinnedEvent as Mock).mockResolvedValue({
      eventId: testEventId,
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).pinnedEventIds).toEqual({});
    await store.dispatch(pinEvent({ id: TimelineId.test, eventId: testEventId }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test).pinnedEventIds).toEqual({
      [testEventId]: true,
    });
  });

  it('should persist a timeline un-pin event', async () => {
    store = createMockStore(
      {
        ...mockGlobalState,
        timeline: {
          ...mockGlobalState.timeline,
          timelineById: {
            ...mockGlobalState.timeline.timelineById,
            [TimelineId.test]: {
              ...mockGlobalState.timeline.timelineById[TimelineId.test],
              pinnedEventIds: {
                [testEventId]: true,
              },
            },
          },
        },
      },
      undefined,
      kibanaMock
    );

    (persistPinnedEvent as Mock).mockResolvedValue({
      unpinned: true,
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).pinnedEventIds).toEqual({
      [testEventId]: true,
    });
    await store.dispatch(unPinEvent({ id: TimelineId.test, eventId: testEventId }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test).pinnedEventIds).toEqual({});
  });

  it('should ensure the timeline is saved or in draft mode before pinning an event', async () => {
    (persistPinnedEvent as Mock).mockResolvedValue({});
    expect(selectTimelineById(store.getState(), TimelineId.test).pinnedEventIds).toEqual({});
    await store.dispatch(pinEvent({ id: TimelineId.test, eventId: testEventId }));

    expect(persistPinnedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        timelineId: mockTimelineSavedObjectId,
        eventId: testEventId,
        pinnedEventId: null,
      })
    );

    expect(ensureTimelineIsSavedMock).toHaveBeenCalled();
  });

  it('should show an error message when the call is unauthorized', async () => {
    (persistPinnedEvent as Mock).mockRejectedValue({
      body: { status_code: 403 },
    });

    await store.dispatch(unPinEvent({ id: TimelineId.test, eventId: testEventId }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(showCallOutUnauthorizedMsgMock).toHaveBeenCalled();
  });

  it('should show a generic error when the persistence throws', async () => {
    const addDangerMock = vi.spyOn(kibanaMock.notifications.toasts, 'addDanger');
    (persistPinnedEvent as Mock).mockImplementation(() => {
      throw new Error();
    });

    await store.dispatch(pinEvent({ id: TimelineId.test, eventId: testEventId }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(addDangerMock).toHaveBeenCalled();
  });
});
