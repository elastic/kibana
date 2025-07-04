/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

interface OpenNoteInExpandableFlyoutClickedParams {
  location: string;
}

interface AddNoteFromExpandableFlyoutClickedParams {
  isRelatedToATimeline: boolean;
}

export enum NotesEventTypes {
  OpenNoteInExpandableFlyoutClicked = 'Open Note In Expandable Flyout Clicked',
  AddNoteFromExpandableFlyoutClicked = 'Add Note From Expandable Flyout Clicked',
}

export interface NotesTelemetryEventsMap {
  [NotesEventTypes.OpenNoteInExpandableFlyoutClicked]: OpenNoteInExpandableFlyoutClickedParams;
  [NotesEventTypes.AddNoteFromExpandableFlyoutClicked]: AddNoteFromExpandableFlyoutClickedParams;
}

export interface NotesTelemetryEvent {
  eventType: NotesEventTypes;
  schema: RootSchema<NotesTelemetryEventsMap[NotesEventTypes]>;
}
