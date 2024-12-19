/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_NOTE = i18n.translate('xpack.securitySolution.notes.addNoteButtonLabel', {
  defaultMessage: 'Add Note',
});

export const NOTE = i18n.translate('xpack.securitySolution.notes.noteLabel', {
  defaultMessage: 'Note',
});

export const NOTES = i18n.translate('xpack.securitySolution.notes.notesTitle', {
  defaultMessage: 'Notes',
});

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.notes.search.FilterByUserOrNotePlaceholder',
  {
    defaultMessage: 'Filter by User or Note',
  }
);

export const CANCEL = i18n.translate('xpack.securitySolution.notes.cancelButtonLabel', {
  defaultMessage: 'Cancel',
});

export const YOU_ARE_EDITING_A_NOTE = i18n.translate(
  'xpack.securitySolution.notes.youAreEditingANoteScreenReaderOnly',
  {
    defaultMessage:
      'You are editing a note. Click Add Note when finished, or press escape to cancel.',
  }
);

export const YOU_ARE_VIEWING_NOTES = (row: number) =>
  i18n.translate('xpack.securitySolution.notes.youAreViewingNotesScreenReaderOnly', {
    values: { row },
    defaultMessage:
      'You are viewing notes for the event in row {row}. Press the up arrow key when finished to return to the event.',
  });

export const CREATED_BY = i18n.translate('xpack.securitySolution.notes.createdByLabel', {
  defaultMessage: 'Created by',
});
