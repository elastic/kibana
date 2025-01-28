/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { NotesDetails } from '../components/notes_details';
import { NOTES_TAB_CONTENT_TEST_ID } from './test_ids';

/**
 * Notes view displayed in the document details expandable flyout left section
 * // TODO to be implemented
 */
export const NotesTab = memo(() => {
  return (
    <EuiPanel data-test-subj={NOTES_TAB_CONTENT_TEST_ID} hasShadow={false}>
      <NotesDetails />
    </EuiPanel>
  );
});

NotesTab.displayName = 'NotesTab';
