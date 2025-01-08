/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ProcessTab } from './tabs/process_tab';
import { MetadataTab } from './tabs/metadata_tab';
import { AlertsTab } from './tabs/alerts_tab';
import { ALERTS_TAB_TEST_ID, METADATA_TAB_TEST_ID, PROCESS_TAB_TEST_ID } from './test_ids';
import type { SessionViewPanelPaths } from '.';

export interface SessionViewPanelTabType {
  id: SessionViewPanelPaths;
  name: ReactElement;
  content: React.ReactElement;
  'data-test-subj': string;
}

export const processTab: SessionViewPanelTabType = {
  id: 'process',
  'data-test-subj': PROCESS_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.preview.sessionview.header.processTabLabel"
      defaultMessage="Process"
    />
  ),
  content: <ProcessTab />,
};

export const metadataTab: SessionViewPanelTabType = {
  id: 'metadata',
  'data-test-subj': METADATA_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.preview.sessionview.header.metadataTabLabel"
      defaultMessage="Metadata"
    />
  ),
  content: <MetadataTab />,
};

export const alertsTab: SessionViewPanelTabType = {
  id: 'alerts',
  'data-test-subj': ALERTS_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.preview.sessionview.header.alertsTabLabel"
      defaultMessage="Alerts"
    />
  ),
  content: <AlertsTab />,
};
