/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FETCH_NOTES_ERROR, NotesHeader } from '../../../flyout/shared/components/notes_header';
import {
  NOTES_ADD_NOTE_BUTTON_TEST_ID,
  NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID,
  NOTES_COUNT_TEST_ID,
  NOTES_LOADING_TEST_ID,
  NOTES_TITLE_TEST_ID,
  NOTES_VIEW_NOTES_BUTTON_TEST_ID,
} from './test_ids';
export { FETCH_NOTES_ERROR };

export interface NotesProps {
  /**
   * Document to display notes for.
   */
  hit: DataTableRecord;
  /**
   * Optional callback that opens the notes details view.
   * When omitted, the component renders the notes count without navigation controls.
   */
  onOpenNotesTab?: () => void;
  /**
   * Optional flag used by the legacy rule preview flow.
   */
  disabled?: boolean;
  /**
   * Optional document id override used by the legacy flyout wrapper.
   */
  documentId?: string;
}

export const Notes = memo(({ hit, onOpenNotesTab, disabled = false, documentId }: NotesProps) => {
  const resolvedDocumentId = useMemo(() => documentId ?? hit.raw._id ?? hit.id, [documentId, hit]);

  if (!resolvedDocumentId) {
    return null;
  }

  return (
    <NotesHeader
      documentId={resolvedDocumentId}
      onOpenNotesTab={onOpenNotesTab}
      disabled={disabled}
      testIds={{
        title: NOTES_TITLE_TEST_ID,
        addNoteButton: NOTES_ADD_NOTE_BUTTON_TEST_ID,
        viewNotesButton: NOTES_VIEW_NOTES_BUTTON_TEST_ID,
        addNoteIconButton: NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID,
        count: NOTES_COUNT_TEST_ID,
        loading: NOTES_LOADING_TEST_ID,
      }}
    />
  );
});

Notes.displayName = 'Notes';
