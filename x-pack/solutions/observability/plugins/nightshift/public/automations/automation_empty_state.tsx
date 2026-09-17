/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function AutomationEmptyState({
  onCreateClick,
}: {
  onCreateClick: () => void;
}): React.ReactElement {
  return (
    <EuiEmptyPrompt
      iconType="watchesApp"
      title={
        <h2>
          {i18n.translate('xpack.nightshift.automations.emptyState.title', {
            defaultMessage: 'No automations yet',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.nightshift.automations.emptyState.body', {
            defaultMessage:
              'Automations watch for events and trigger investigations automatically. Create your first automation to get started.',
          })}
        </p>
      }
      actions={
        <EuiButton fill onClick={onCreateClick} data-test-subj="nightshiftCreateFirstAutomation">
          {i18n.translate('xpack.nightshift.automations.emptyState.createButton', {
            defaultMessage: 'Create automation',
          })}
        </EuiButton>
      }
    />
  );
}
