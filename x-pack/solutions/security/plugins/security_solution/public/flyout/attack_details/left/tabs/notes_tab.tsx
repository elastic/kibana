/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { NotesDetailsContent } from '../../../shared/components/notes_details_content';
import { useAttackDetailsContext } from '../../context';
import { NOTES_TAB_CONTENT_TEST_ID } from '../../constants/test_ids';

/**
 * Notes tab content for the Attack Details flyout left panel.
 */
export const NotesTab = memo(() => {
  const { attackId, searchHit } = useAttackDetailsContext();

  return (
    <EuiPanel data-test-subj={NOTES_TAB_CONTENT_TEST_ID} hasShadow={false}>
      <NotesDetailsContent documentId={attackId} searchHit={searchHit} />
    </EuiPanel>
  );
});

NotesTab.displayName = 'NotesTab';
