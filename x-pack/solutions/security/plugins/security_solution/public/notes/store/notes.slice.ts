/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityState, SerializedError } from '@reduxjs/toolkit';
import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { AssociatedFilter } from '../../../common/notes/constants';
import type { State } from '../../common/store';
import {
  createNote as createNoteApi,
  deleteNotes as deleteNotesApi,
  fetchNotes as fetchNotesApi,
  fetchNotesByDocumentIds as fetchNotesByDocumentIdsApi,
  fetchNotesBySaveObjectIds as fetchNotesBySaveObjectIdsApi,
} from '../api/api';
import type { NormalizedEntities, NormalizedEntity } from './normalize';
import { normalizeEntities, normalizeEntity } from './normalize';
import type { BareNote, Note } from '../../../common/api/timeline';

export enum ReqStatus {
  Idle = 'idle',
  Loading = 'loading',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

export interface HttpError {
  type: 'http';
  status: number;
}

export interface NotesState extends EntityState<Note> {
  status: {
    fetchNotesByDocumentIds: ReqStatus;
    fetchNotesBySavedObjectIds: ReqStatus;
    createNote: ReqStatus;
    deleteNotes: ReqStatus;
    fetchNotes: ReqStatus;
  };
  error: {
    fetchNotesByDocumentIds: SerializedError | HttpError | null;
    fetchNotesBySavedObjectIds: SerializedError | HttpError | null;
    createNote: SerializedError | HttpError | null;
    deleteNotes: SerializedError | HttpError | null;
    fetchNotes: SerializedError | HttpError | null;
  };
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
  sort: {
    field: keyof Note;
    direction: 'asc' | 'desc';
  };
  filter: string;
  createdByFilter: string;
  search: string;
  associatedFilter: AssociatedFilter;
  selectedIds: string[];
  pendingDeleteIds: string[];
}

const notesAdapter = createEntityAdapter<Note>({
  selectId: (note: Note) => note.noteId,
});

export const initialNotesState: NotesState = notesAdapter.getInitialState({
  status: {
    fetchNotesByDocumentIds: ReqStatus.Idle,
    fetchNotesBySavedObjectIds: ReqStatus.Idle,
    createNote: ReqStatus.Idle,
    deleteNotes: ReqStatus.Idle,
    fetchNotes: ReqStatus.Idle,
  },
  error: {
    fetchNotesByDocumentIds: null,
    fetchNotesBySavedObjectIds: null,
    createNote: null,
    deleteNotes: null,
    fetchNotes: null,
  },
  pagination: {
    page: 1,
    perPage: 10,
    total: 0,
  },
  sort: {
    field: 'created',
    direction: 'desc',
  },
  filter: '',
  createdByFilter: '',
  associatedFilter: AssociatedFilter.all,
  search: '',
  selectedIds: [],
  pendingDeleteIds: [],
});

export const fetchNotesByDocumentIds = createAsyncThunk<
  NormalizedEntities<Note>,
  { documentIds: string[] },
  {}
>('notes/fetchNotesByDocumentIds', async (args) => {
  const { documentIds } = args;
  const res = await fetchNotesByDocumentIdsApi(documentIds);
  return normalizeEntities('notes' in res ? res.notes : []);
});

export const fetchNotesBySavedObjectIds = createAsyncThunk<
  NormalizedEntities<Note>,
  { savedObjectIds: string[] },
  {}
>('notes/fetchNotesBySavedObjectIds', async (args) => {
  const { savedObjectIds } = args;
  const res = await fetchNotesBySaveObjectIdsApi(savedObjectIds);
  return normalizeEntities('notes' in res ? res.notes : []);
});

export const fetchNotes = createAsyncThunk<
  NormalizedEntities<Note> & { totalCount: number },
  {
    page: number;
    perPage: number;
    sortField: string;
    sortOrder: string;
    filter: string;
    createdByFilter: string;
    associatedFilter: AssociatedFilter;
    search: string;
  },
  {}
>('notes/fetchNotes', async (args) => {
  const { page, perPage, sortField, sortOrder, filter, createdByFilter, associatedFilter, search } =
    args;
  const res = await fetchNotesApi({
    page,
    perPage,
    sortField,
    sortOrder,
    filter,
    createdByFilter,
    associatedFilter,
    search,
  });
  return {
    ...normalizeEntities('notes' in res ? res.notes : []),
    totalCount: 'totalCount' in res ? res.totalCount : 0,
  };
});

export const createNote = createAsyncThunk<NormalizedEntity<Note>, { note: BareNote }, {}>(
  'notes/createNote',
  async (args) => {
    const { note } = args;
    const res = await createNoteApi({ note });
    return normalizeEntity(res);
  }
);

export const deleteNotes = createAsyncThunk<string[], { ids: string[]; refetch?: boolean }, {}>(
  'notes/deleteNotes',
  async (args, { dispatch, getState }) => {
    const { ids, refetch } = args;
    await deleteNotesApi(ids);
    if (refetch) {
      const state = getState() as State;
      const { search, pagination, createdByFilter, associatedFilter, sort } = state.notes;
      dispatch(
        fetchNotes({
          page: pagination.page,
          perPage: pagination.perPage,
          sortField: sort.field,
          sortOrder: sort.direction,
          filter: '',
          createdByFilter,
          associatedFilter,
          search,
        })
      );
    }
    return ids;
  }
);

const notesSlice = createSlice({
  name: 'notes',
  initialState: initialNotesState,
  reducers: {
    userSelectedPage: (state: NotesState, action: { payload: number }) => {
      state.pagination.page = action.payload;
    },
    userSelectedPerPage: (state: NotesState, action: { payload: number }) => {
      state.pagination.perPage = action.payload;
    },
    userSortedNotes: (
      state: NotesState,
      action: { payload: { field: keyof Note; direction: 'asc' | 'desc' } }
    ) => {
      state.sort = action.payload;
    },
    userFilteredNotes: (state: NotesState, action: { payload: string }) => {
      state.filter = action.payload;
    },
    userFilterCreatedBy: (state: NotesState, action: { payload: string }) => {
      state.createdByFilter = action.payload;
    },
    userFilterAssociatedNotes: (state: NotesState, action: { payload: AssociatedFilter }) => {
      state.associatedFilter = action.payload;
    },
    userSearchedNotes: (state: NotesState, action: { payload: string }) => {
      state.search = action.payload;
    },
    userSelectedRow: (state: NotesState, action: { payload: string[] }) => {
      state.selectedIds = action.payload;
    },
    userClosedDeleteModal: (state: NotesState) => {
      state.pendingDeleteIds = [];
    },
    userSelectedNotesForDeletion: (state: NotesState, action: { payload: string }) => {
      state.pendingDeleteIds = [action.payload];
    },
    userSelectedBulkDelete: (state: NotesState) => {
      state.pendingDeleteIds = state.selectedIds;
    },
    userClosedCreateErrorToast: (state: NotesState) => {
      state.error.createNote = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchNotesByDocumentIds.pending, (state: NotesState) => {
        state.status.fetchNotesByDocumentIds = ReqStatus.Loading;
      })
      .addCase(fetchNotesByDocumentIds.fulfilled, (state: NotesState, action) => {
        notesAdapter.upsertMany(state, action.payload.entities.notes);
        state.status.fetchNotesByDocumentIds = ReqStatus.Succeeded;
      })
      .addCase(fetchNotesByDocumentIds.rejected, (state: NotesState, action) => {
        state.status.fetchNotesByDocumentIds = ReqStatus.Failed;
        state.error.fetchNotesByDocumentIds = action.payload ?? action.error;
      })
      .addCase(fetchNotesBySavedObjectIds.pending, (state: NotesState) => {
        state.status.fetchNotesBySavedObjectIds = ReqStatus.Loading;
      })
      .addCase(fetchNotesBySavedObjectIds.fulfilled, (state: NotesState, action) => {
        notesAdapter.upsertMany(state, action.payload.entities.notes);
        state.status.fetchNotesBySavedObjectIds = ReqStatus.Succeeded;
      })
      .addCase(fetchNotesBySavedObjectIds.rejected, (state: NotesState, action) => {
        state.status.fetchNotesBySavedObjectIds = ReqStatus.Failed;
        state.error.fetchNotesBySavedObjectIds = action.payload ?? action.error;
      })
      .addCase(createNote.pending, (state: NotesState) => {
        state.status.createNote = ReqStatus.Loading;
      })
      .addCase(createNote.fulfilled, (state: NotesState, action) => {
        notesAdapter.addMany(state, action.payload.entities.notes);
        state.status.createNote = ReqStatus.Succeeded;
      })
      .addCase(createNote.rejected, (state: NotesState, action) => {
        state.status.createNote = ReqStatus.Failed;
        state.error.createNote = action.payload ?? action.error;
      })
      .addCase(deleteNotes.pending, (state: NotesState) => {
        state.status.deleteNotes = ReqStatus.Loading;
      })
      .addCase(deleteNotes.fulfilled, (state: NotesState, action) => {
        notesAdapter.removeMany(state, action.payload);
        state.status.deleteNotes = ReqStatus.Succeeded;
        state.pendingDeleteIds = state.pendingDeleteIds.filter(
          (value) => !action.payload.includes(value)
        );
      })
      .addCase(deleteNotes.rejected, (state: NotesState, action) => {
        state.status.deleteNotes = ReqStatus.Failed;
        state.error.deleteNotes = action.payload ?? action.error;
      })
      .addCase(fetchNotes.pending, (state: NotesState) => {
        state.status.fetchNotes = ReqStatus.Loading;
      })
      .addCase(fetchNotes.fulfilled, (state: NotesState, action) => {
        notesAdapter.setAll(state, action.payload.entities.notes);
        state.pagination.total = action.payload.totalCount;
        state.status.fetchNotes = ReqStatus.Succeeded;
        state.selectedIds = [];
      })
      .addCase(fetchNotes.rejected, (state: NotesState, action) => {
        state.status.fetchNotes = ReqStatus.Failed;
        state.error.fetchNotes = action.payload ?? action.error;
      });
  },
});

export const notesReducer = notesSlice.reducer;

export const {
  selectAll: selectAllNotes,
  selectById: selectNoteById,
  selectIds: selectNoteIds,
} = notesAdapter.getSelectors((state: State) => state.notes);

export const selectFetchNotesByDocumentIdsStatus = (state: State) =>
  state.notes.status.fetchNotesByDocumentIds;

export const selectFetchNotesByDocumentIdsError = (state: State) =>
  state.notes.error.fetchNotesByDocumentIds;

export const selectFetchNotesBySavedObjectIdsStatus = (state: State) =>
  state.notes.status.fetchNotesBySavedObjectIds;

export const selectFetchNotesBySavedObjectIdsError = (state: State) =>
  state.notes.error.fetchNotesBySavedObjectIds;

export const selectCreateNoteStatus = (state: State) => state.notes.status.createNote;

export const selectCreateNoteError = (state: State) => state.notes.error.createNote;

export const selectDeleteNotesStatus = (state: State) => state.notes.status.deleteNotes;

export const selectDeleteNotesError = (state: State) => state.notes.error.deleteNotes;

export const selectNotesPagination = (state: State) => state.notes.pagination;

export const selectNotesTableSort = (state: State) => state.notes.sort;

export const selectNotesTableSelectedIds = (state: State) => state.notes.selectedIds;

export const selectNotesTableSearch = (state: State) => state.notes.search;

export const selectNotesTableCreatedByFilter = (state: State) => state.notes.createdByFilter;

export const selectNotesTableAssociatedFilter = (state: State) => state.notes.associatedFilter;

export const selectNotesTablePendingDeleteIds = (state: State) => state.notes.pendingDeleteIds;

export const selectFetchNotesError = (state: State) => state.notes.error.fetchNotes;

export const selectFetchNotesStatus = (state: State) => state.notes.status.fetchNotes;

export const selectNotesByDocumentId = createSelector(
  [selectAllNotes, (_: State, documentId: string) => documentId],
  (notes, documentId) => notes.filter((note) => note.eventId === documentId)
);

export const selectNotesBySavedObjectId = createSelector(
  [selectAllNotes, (_: State, savedObjectId: string) => savedObjectId],
  (notes, savedObjectId) =>
    savedObjectId.length > 0 ? notes.filter((note) => note.timelineId === savedObjectId) : []
);

export const selectDocumentNotesBySavedObjectId = createSelector(
  [
    selectAllNotes,
    (_: State, { documentId, savedObjectId }: { documentId: string; savedObjectId: string }) => ({
      documentId,
      savedObjectId,
    }),
  ],
  (notes, { documentId, savedObjectId }) =>
    notes.filter((note) => note.eventId === documentId && note.timelineId === savedObjectId)
);

export const selectSortedNotesByDocumentId = createSelector(
  [
    selectAllNotes,
    (
      _: State,
      {
        documentId,
        sort,
      }: { documentId: string; sort: { field: keyof Note; direction: 'asc' | 'desc' } }
    ) => ({ documentId, sort }),
  ],
  (notes, { documentId, sort }) => {
    const { field, direction } = sort;
    return notes
      .filter((note: Note) => note.eventId === documentId)
      .sort((first: Note, second: Note) => {
        const a = first[field];
        const b = second[field];
        if (a == null) return 1;
        if (b == null) return -1;
        return direction === 'asc' ? (a > b ? 1 : -1) : a > b ? -1 : 1;
      });
  }
);

export const selectSortedNotesBySavedObjectId = createSelector(
  [
    selectAllNotes,
    (
      _: State,
      {
        savedObjectId,
        sort,
      }: { savedObjectId: string; sort: { field: keyof Note; direction: 'asc' | 'desc' } }
    ) => ({ savedObjectId, sort }),
  ],
  (notes, { savedObjectId, sort }) => {
    const { field, direction } = sort;
    if (savedObjectId.length === 0) {
      return [];
    }
    return notes
      .filter((note: Note) => note.timelineId === savedObjectId)
      .sort((first: Note, second: Note) => {
        const a = first[field];
        const b = second[field];
        if (a == null) return 1;
        if (b == null) return -1;
        return direction === 'asc' ? (a > b ? 1 : -1) : a > b ? -1 : 1;
      });
  }
);

export const {
  userSelectedPage,
  userSelectedPerPage,
  userSortedNotes,
  userFilteredNotes,
  userFilterCreatedBy,
  userFilterAssociatedNotes,
  userSearchedNotes,
  userSelectedRow,
  userClosedDeleteModal,
  userClosedCreateErrorToast,
  userSelectedNotesForDeletion,
  userSelectedBulkDelete,
} = notesSlice.actions;
