/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useDocumentDetailsContext } from '../../shared/context';
import {
  NOTES_ADD_NOTE_BUTTON_TEST_ID,
  NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID,
  NOTES_COUNT_TEST_ID,
  NOTES_LOADING_TEST_ID,
  NOTES_TITLE_TEST_ID,
  NOTES_VIEW_NOTES_BUTTON_TEST_ID,
} from './test_ids';
import { FETCH_NOTES_ERROR, NotesHeader } from '../../../shared/components/notes_header';

export { FETCH_NOTES_ERROR };
import { LeftPanelNotesTab } from '../../left';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';

/**
 * Renders a block with the number of notes for the event in the document details flyout header.
 */
export const Notes = memo(() => {
  const { eventId, isRulePreview } = useDocumentDetailsContext();
  const openNotesTab = useNavigateToLeftPanel({ tab: LeftPanelNotesTab });

  return (
    <NotesHeader
      documentId={eventId}
      onOpenNotesTab={openNotesTab}
      disabled={isRulePreview}
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
