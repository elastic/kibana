/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { NOTES_DETAILS_TEST_ID } from '../../../flyout_v2/notes/test_ids';
import type { LeftPanelPaths } from '../constants/left_panel_paths';
import { INSIGHTS_TAB_TEST_ID } from '../constants/test_ids';
import { InsightsTab } from './tabs/insights_tab';
import { NotesTab } from './tabs/notes_tab';

export interface LeftPanelTabType {
  id: LeftPanelPaths;
  'data-test-subj': string;
  name: ReactElement;
  content: React.ReactElement;
}

export const insightsTab: LeftPanelTabType = {
  id: 'insights',
  'data-test-subj': INSIGHTS_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.attackDetails.left.insights.tabLabel"
      defaultMessage="Insights"
    />
  ),
  content: <InsightsTab />,
};

export const notesTab: LeftPanelTabType = {
  id: 'notes',
  'data-test-subj': NOTES_DETAILS_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.left.notes.tabLabel"
      defaultMessage="Notes"
    />
  ),
  content: <NotesTab />,
};
