/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { ErrorModel, NotesById } from './model';
import type { State } from '../types';

export const selectNotesById = (state: State): NotesById => state.app.notesById;

const getErrors = (state: State): ErrorModel => state.app.errors;

export const selectNotesByIdSelector = createSelector(
  selectNotesById,
  (notesById: NotesById) => notesById
);

export const errorsSelector = () => createSelector(getErrors, (errors) => errors);
