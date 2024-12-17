/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotesTelemetryEvent } from './types';
import { NotesEventTypes } from './types';

export const openNoteInExpandableFlyoutClickedEvent: NotesTelemetryEvent = {
  eventType: NotesEventTypes.OpenNoteInExpandableFlyoutClicked,
  schema: {
    location: {
      type: 'text',
      _meta: {
        description: 'Table ID or timeline ID',
        optional: false,
      },
    },
  },
};

export const addNoteFromExpandableFlyoutClickedEvent: NotesTelemetryEvent = {
  eventType: NotesEventTypes.AddNoteFromExpandableFlyoutClicked,
  schema: {
    isRelatedToATimeline: {
      type: 'boolean',
      _meta: {
        description: 'If the note was added related to a saved timeline',
        optional: false,
      },
    },
  },
};

export const notesTelemetryEvents = [
  openNoteInExpandableFlyoutClickedEvent,
  addNoteFromExpandableFlyoutClickedEvent,
];
