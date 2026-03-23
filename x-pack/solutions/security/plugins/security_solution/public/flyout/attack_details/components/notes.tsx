/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useAttackDetailsContext } from '../context';
import {
  HEADER_NOTES_ADD_NOTE_BUTTON_TEST_ID,
  HEADER_NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID,
  HEADER_NOTES_COUNT_TEST_ID,
  HEADER_NOTES_LOADING_TEST_ID,
  HEADER_NOTES_TITLE_TEST_ID,
  HEADER_NOTES_VIEW_NOTES_BUTTON_TEST_ID,
} from '../constants/test_ids';
import { NotesHeader } from '../../shared/components/notes_header';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';

/**
 * Renders a block with the number of notes for the attack in the flyout header.
 * Matches the document details flyout header Notes block behavior.
 */
export const Notes = memo(() => {
  const { attackId } = useAttackDetailsContext();
  const openNotesTab = useNavigateToAttackDetailsLeftPanel({ tab: 'notes' });

  return (
    <NotesHeader
      documentId={attackId}
      onOpenNotesTab={openNotesTab}
      testIds={{
        title: HEADER_NOTES_TITLE_TEST_ID,
        addNoteButton: HEADER_NOTES_ADD_NOTE_BUTTON_TEST_ID,
        viewNotesButton: HEADER_NOTES_VIEW_NOTES_BUTTON_TEST_ID,
        addNoteIconButton: HEADER_NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID,
        count: HEADER_NOTES_COUNT_TEST_ID,
        loading: HEADER_NOTES_LOADING_TEST_ID,
      }}
    />
  );
});

Notes.displayName = 'Notes';
