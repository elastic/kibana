/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys, values } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { createSelector } from 'reselect';
import type { Note } from '../../lib/note';
import type { ErrorModel, NotesById } from './model';
import type { State } from '../types';
import type { TimelineResultNote } from '../../../timelines/components/open_timeline/types';

export const selectNotesById = (state: State): NotesById => state.app.notesById;

const getErrors = (state: State): ErrorModel => state.app.errors;

export const getNotes = memoizeOne((notesById: NotesById, noteIds: string[]): Note[] =>
  keys(notesById).reduce((acc: Note[], noteId: string) => {
    if (noteIds.includes(noteId)) {
      const note: Note = notesById[noteId];
      return [...acc, note];
    }
    return acc;
  }, [])
);

export const getNotesAsCommentsList = (notesById: NotesById): TimelineResultNote[] =>
  values(notesById).map((note) => ({
    eventId: note.eventId,
    savedObjectId: note.saveObjectId,
    note: note.note,
    noteId: note.id,
    updated: (note.lastEdit ?? note.created).getTime(),
    updatedBy: note.user,
  }));

export const selectNotesByIdSelector = createSelector(
  selectNotesById,
  (notesById: NotesById) => notesById
);

export const notesByIdsSelector = () =>
  createSelector(selectNotesById, (notesById: NotesById) => notesById);

export const selectNotesAsCommentsListSelector = () =>
  createSelector(selectNotesById, getNotesAsCommentsList);

export const errorsSelector = () => createSelector(getErrors, (errors) => errors);
