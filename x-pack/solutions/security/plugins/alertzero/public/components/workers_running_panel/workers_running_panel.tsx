/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';

const TITLE = i18n.translate('xpack.alertzero.workersRunningPanel.title', {
  defaultMessage: 'Workers are running in the background',
});

const BODY = i18n.translate('xpack.alertzero.workersRunningPanel.body', {
  defaultMessage: 'Proposals land here as each Worker finishes. Nothing needs you right now.',
});

export const WorkersRunningPanel: React.FC = () => (
  <EuiPanel
    hasBorder
    hasShadow={false}
    paddingSize="xl"
    data-test-subj="alertZeroWorkersRunningPanel"
  >
    <EuiEmptyPrompt
      iconType="logoElastic"
      paddingSize="none"
      titleSize="xs"
      title={<h4>{TITLE}</h4>}
      body={<p>{BODY}</p>}
    />
  </EuiPanel>
);
