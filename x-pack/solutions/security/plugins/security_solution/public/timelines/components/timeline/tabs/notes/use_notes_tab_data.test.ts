/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TimelineId } from '../../../../../../common/types';
import { TimelineStatusEnum } from '../../../../../../common/api/timeline';
import { fetchNotesBySavedObjectIds, ReqStatus } from '../../../../../notes';
import type { State } from '../../../../../common/store';
import { useNotesTabData } from './use_notes_tab_data';

jest.mock('../../../../../notes', () => {
  const actual = jest.requireActual('../../../../../notes');
  return {
    fetchNotesBySavedObjectIds: jest.fn((args) => ({ type: 'FETCH_NOTES', payload: args })),
    makeSelectNotesBySavedObjectId: actual.makeSelectNotesBySavedObjectId,
    makeSelectNotesBySavedObjectIds: actual.makeSelectNotesBySavedObjectIds,
    selectFetchNotesBySavedObjectIdsStatus: actual.selectFetchNotesBySavedObjectIdsStatus,
    ReqStatus: actual.ReqStatus,
  };
});

// ── Mock state factory ────────────────────────────────────────────────────────

const makeTimeline = (overrides: Record<string, unknown> = {}) => ({
  isSuperTimeline: false,
  savedObjectId: 'so-test',
  status: TimelineStatusEnum.active,
  superTimelineSourceIds: [],
  superTimelineSourceTitles: [],
  superTimelineDescriptions: [],
  ...overrides,
});

const makeNotesState = (
  entities: Record<string, unknown> = {},
  ids: string[] = [],
  fetchStatus: string = ReqStatus.Idle
) => ({
  ids,
  entities,
  status: {
    fetchNotesBySavedObjectIds: fetchStatus,
    fetchNotesByDocumentIds: ReqStatus.Idle,
    createNote: ReqStatus.Idle,
    deleteNotes: ReqStatus.Idle,
    fetchNotes: ReqStatus.Idle,
  },
  error: {
    fetchNotesBySavedObjectIds: null,
    fetchNotesByDocumentIds: null,
    createNote: null,
    deleteNotes: null,
    fetchNotes: null,
  },
  pagination: { page: 1, perPage: 10, total: 0 },
  sort: { field: 'created' as const, direction: 'desc' as const },
  filter: '',
  createdByFilter: '',
  associatedFilter: 'all',
  search: '',
  selectedIds: [],
  pendingDeleteIds: [],
});

const mockDispatch = jest.fn();
jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useSelector: (selector: (s: unknown) => unknown) => selector(mockState as State),
  useDispatch: () => mockDispatch,
}));

let mockState: Pick<State, 'timeline' | 'notes'>;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useNotesTabData', () => {
  const timelineId = TimelineId.test;

  beforeEach(() => {
    mockState = {
      timeline: {
        showCallOutUnauthorizedMsg: false,
        insertTimeline: null,
        timelineById: {
          [timelineId]: makeTimeline() as unknown as State['timeline']['timelineById'][string],
        },
      },
      notes: makeNotesState() as unknown as State['notes'],
    };
  });

  describe('regular timeline (isSuperTimeline: false)', () => {
    it('returns notes matching the timeline savedObjectId', () => {
      const savedObjectId = 'so-regular';
      mockState = {
        ...mockState,
        timeline: {
          ...mockState.timeline,
          timelineById: {
            [timelineId]: makeTimeline({
              savedObjectId,
            }) as unknown as State['timeline']['timelineById'][string],
          },
        },
        notes: makeNotesState(
          {
            'note-1': {
              noteId: 'note-1',
              timelineId: savedObjectId,
              note: 'hello',
              created: 0,
              createdBy: 'u',
              updated: 0,
              updatedBy: 'u',
              version: 'v',
            },
            'note-x': {
              noteId: 'note-x',
              timelineId: 'other-tl',
              note: 'other',
              created: 0,
              createdBy: 'u',
              updated: 0,
              updatedBy: 'u',
              version: 'v',
            },
          },
          ['note-1', 'note-x'],
          ReqStatus.Succeeded
        ) as unknown as State['notes'],
      };

      const { result } = renderHook(() => useNotesTabData(timelineId));

      expect(result.current.isSuperTimeline).toBe(false);
      expect(result.current.notes).toHaveLength(1);
      expect(result.current.notes[0].noteId).toBe('note-1');
    });
  });

  describe('super timeline (isSuperTimeline: true)', () => {
    it('returns notes for all source timeline ids', () => {
      const sourceIds = ['tl-a', 'tl-b'];
      mockState = {
        ...mockState,
        timeline: {
          ...mockState.timeline,
          timelineById: {
            [timelineId]: makeTimeline({
              isSuperTimeline: true,
              superTimelineSourceIds: sourceIds,
            }) as unknown as State['timeline']['timelineById'][string],
          },
        },
        notes: makeNotesState(
          {
            'note-a': {
              noteId: 'note-a',
              timelineId: 'tl-a',
              note: 'from a',
              created: 0,
              createdBy: 'u',
              updated: 0,
              updatedBy: 'u',
              version: 'v',
            },
            'note-b': {
              noteId: 'note-b',
              timelineId: 'tl-b',
              note: 'from b',
              created: 0,
              createdBy: 'u',
              updated: 0,
              updatedBy: 'u',
              version: 'v',
            },
            'note-x': {
              noteId: 'note-x',
              timelineId: 'unrelated',
              note: 'unrelated',
              created: 0,
              createdBy: 'u',
              updated: 0,
              updatedBy: 'u',
              version: 'v',
            },
          },
          ['note-a', 'note-b', 'note-x'],
          ReqStatus.Succeeded
        ) as unknown as State['notes'],
      };

      const { result } = renderHook(() => useNotesTabData(timelineId));

      expect(result.current.isSuperTimeline).toBe(true);
      const noteIds = result.current.notes.map((n) => n.noteId);
      expect(noteIds).toContain('note-a');
      expect(noteIds).toContain('note-b');
      expect(noteIds).not.toContain('note-x');
    });
  });

  describe('isTimelineSaved', () => {
    it('is true when timeline.status === TimelineStatusEnum.active', () => {
      mockState = {
        ...mockState,
        timeline: {
          ...mockState.timeline,
          timelineById: {
            [timelineId]: makeTimeline({
              status: TimelineStatusEnum.active,
            }) as unknown as State['timeline']['timelineById'][string],
          },
        },
      };
      const { result } = renderHook(() => useNotesTabData(timelineId));
      expect(result.current.isTimelineSaved).toBe(true);
    });

    it.each([TimelineStatusEnum.draft, TimelineStatusEnum.immutable])(
      'is false when timeline.status is %s',
      (status) => {
        mockState = {
          ...mockState,
          timeline: {
            ...mockState.timeline,
            timelineById: {
              [timelineId]: makeTimeline({
                status,
              }) as unknown as State['timeline']['timelineById'][string],
            },
          },
        };
        const { result } = renderHook(() => useNotesTabData(timelineId));
        expect(result.current.isTimelineSaved).toBe(false);
      }
    );
  });

  describe('savedObjectId', () => {
    it('falls back to empty string when timeline.savedObjectId is null', () => {
      mockState = {
        ...mockState,
        timeline: {
          ...mockState.timeline,
          timelineById: {
            [timelineId]: makeTimeline({
              savedObjectId: null,
            }) as unknown as State['timeline']['timelineById'][string],
          },
        },
      };
      const { result } = renderHook(() => useNotesTabData(timelineId));
      expect(result.current.savedObjectId).toBe('');
    });
  });

  describe('fetch side-effect', () => {
    beforeEach(() => {
      mockDispatch.mockClear();
      (fetchNotesBySavedObjectIds as unknown as jest.Mock).mockClear();
    });

    it('dispatches fetchNotesBySavedObjectIds on mount for a saved regular timeline', () => {
      mockState = {
        ...mockState,
        timeline: {
          ...mockState.timeline,
          timelineById: {
            [timelineId]: makeTimeline({
              isSuperTimeline: false,
              savedObjectId: 'so-123',
              status: TimelineStatusEnum.active,
            }) as unknown as State['timeline']['timelineById'][string],
          },
        },
      };

      renderHook(() => useNotesTabData(timelineId));

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(fetchNotesBySavedObjectIds).toHaveBeenCalledWith({
        savedObjectIds: ['so-123'],
      });
    });

    it('does not dispatch when the timeline is not saved', () => {
      mockState = {
        ...mockState,
        timeline: {
          ...mockState.timeline,
          timelineById: {
            [timelineId]: makeTimeline({
              isSuperTimeline: false,
              savedObjectId: 'so-123',
              status: TimelineStatusEnum.draft,
            }) as unknown as State['timeline']['timelineById'][string],
          },
        },
      };

      renderHook(() => useNotesTabData(timelineId));

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch for a super timeline', () => {
      mockState = {
        ...mockState,
        timeline: {
          ...mockState.timeline,
          timelineById: {
            [timelineId]: makeTimeline({
              isSuperTimeline: true,
              savedObjectId: 'so-123',
              status: TimelineStatusEnum.active,
              superTimelineSourceIds: ['tl-a'],
            }) as unknown as State['timeline']['timelineById'][string],
          },
        },
      };

      renderHook(() => useNotesTabData(timelineId));

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
