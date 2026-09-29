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
import { persistNote } from '../../containers/notes/api';
import { refreshTimelines, ensureTimelineIsSaved } from './helpers';

import {
  startTimelineSaving,
  endTimelineSaving,
  showCallOutUnauthorizedMsg,
  addNote,
  addNoteToEvent,
  pinEvent,
} from '../actions';
import { updateNote } from '../../../common/store/app/actions';
import { createNote } from '../../components/notes/helpers';

vi.mock('../actions', async () => {
  const actual = (await vi.importActual('../actions'));
  const endTLSaving = vi.fn((...args) => actual.endTimelineSaving(...args));
  (endTLSaving as unknown as { match: Function }).match = () => false;
  return {
    ...actual,
    pinEvent: vi.fn((...args) => actual.pinEvent(...args)),
    showCallOutUnauthorizedMsg: vi
      .fn()
      .mockImplementation((...args) => actual.showCallOutUnauthorizedMsg(...args)),
    startTimelineSaving: vi
      .fn()
      .mockImplementation((...args) => actual.startTimelineSaving(...args)),
    endTimelineSaving: endTLSaving,
  };
});
vi.mock('../../containers/notes/api');
const mockTimelineSavedObjectId = 'mockTimelineSavedObjectId';
vi.mock('./helpers', async () => {
  const actual = (await vi.importActual('./helpers'));
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
const pinEventMock = pinEvent as unknown as Mock;
const ensureTimelineIsSavedMock = ensureTimelineIsSaved as unknown as Mock;

describe('Timeline note middleware', () => {
  let store = createMockStore(undefined, undefined, kibanaMock);
  const testNote = createNote({ newNote: 'test', user: 'elastic' });
  const testEventId = 'test';

  beforeEach(() => {
    store = createMockStore(undefined, undefined, kibanaMock);
    vi.clearAllMocks();
  });

  it('should persist a timeline note', async () => {
    (persistNote as Mock).mockResolvedValue({
      note: {
        noteId: testNote.id,
      },
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).noteIds).toEqual([]);
    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(addNote({ id: TimelineId.test, noteId: testNote.id }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test).noteIds).toContain(testNote.id);
  });

  it('should persist a note on an event of a timeline', async () => {
    (persistNote as Mock).mockResolvedValue({
      note: {
        noteId: testNote.id,
      },
    });
    expect(selectTimelineById(store.getState(), TimelineId.test).eventIdToNoteIds).toEqual({
      // existing note
      '1': ['1'],
    });
    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(
      addNoteToEvent({ eventId: testEventId, id: TimelineId.test, noteId: testNote.id })
    );

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(refreshTimelines as unknown as Mock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(selectTimelineById(store.getState(), TimelineId.test).eventIdToNoteIds).toEqual(
      expect.objectContaining({
        [testEventId]: [testNote.id],
      })
    );
  });

  it('should ensure the timeline is saved or in draft mode before creating a note', async () => {
    (persistNote as Mock).mockResolvedValue({
      note: {
        noteId: testNote.id,
      },
    });

    expect(selectTimelineById(store.getState(), TimelineId.test)).toEqual(
      expect.objectContaining({
        savedObjectId: null,
        version: null,
      })
    );
    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(
      addNoteToEvent({ eventId: testEventId, id: TimelineId.test, noteId: testNote.id })
    );

    expect(persistNote).toHaveBeenCalledWith(
      expect.objectContaining({
        note: expect.objectContaining({
          timelineId: mockTimelineSavedObjectId,
        }),
      })
    );

    expect(ensureTimelineIsSavedMock).toHaveBeenCalled();
  });

  it('should pin the event when the event is not pinned yet', async () => {
    const testTimelineId = 'testTimelineId';
    (persistNote as Mock).mockResolvedValue({
      note: {
        noteId: testNote.id,
        timelineId: testTimelineId,
      },
    });

    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(
      addNoteToEvent({
        eventId: testEventId,
        id: TimelineId.test,
        noteId: testNote.id,
      })
    );

    expect(pinEventMock).toHaveBeenCalledWith({
      eventId: testEventId,
      id: TimelineId.test,
    });
  });

  it('should not pin the event when the event is already pinned', async () => {
    store = createMockStore(
      {
        ...mockGlobalState,
        timeline: {
          ...mockGlobalState.timeline,
          timelineById: {
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
    const testTimelineId = 'testTimelineId';
    (persistNote as Mock).mockResolvedValue({
      note: {
        noteId: testNote.id,
        timelineId: testTimelineId,
      },
    });

    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(
      addNoteToEvent({
        eventId: testEventId,
        id: TimelineId.test,
        noteId: testNote.id,
      })
    );

    expect(pinEventMock).not.toHaveBeenCalled();
  });

  it('should show an error message when the call is unauthorized', async () => {
    (persistNote as Mock).mockRejectedValue({
      body: { status_code: 403 },
    });

    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(addNote({ id: TimelineId.test, noteId: testNote.id }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(showCallOutUnauthorizedMsgMock).toHaveBeenCalled();
  });

  it('should show a generic error when the persistence throws', async () => {
    const addDangerMock = vi.spyOn(kibanaMock.notifications.toasts, 'addDanger');
    (persistNote as Mock).mockImplementation(() => {
      throw new Error();
    });

    await store.dispatch(updateNote({ note: testNote }));
    await store.dispatch(addNote({ id: TimelineId.test, noteId: testNote.id }));

    expect(startTimelineSavingMock).toHaveBeenCalled();
    expect(endTimelineSavingMock).toHaveBeenCalled();
    expect(addDangerMock).toHaveBeenCalled();
  });
});
