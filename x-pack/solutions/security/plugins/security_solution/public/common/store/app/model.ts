/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Note } from '../../lib/note';

export type ErrorState = ErrorModel;

export interface NotesById {
  [id: string]: Note;
}

export interface Error {
  id: string;
  title: string;
  message: string[];
  hash?: string;
  displayError?: boolean;
}

export type ErrorModel = Error[];

export interface AppModel {
  notesById: NotesById;
  errors: ErrorState;
}
