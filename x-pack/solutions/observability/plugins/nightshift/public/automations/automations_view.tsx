/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetchAutomations } from '../hooks/use_fetch_automations';
import { AutomationEmptyState } from './automation_empty_state';
import { AutomationListItem } from './automation_list_item';
import { CreateAutomationFlyout } from './create_automation_flyout';

export function AutomationsView(): React.ReactElement {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const { data, isLoading, error } = useFetchAutomations();

  const automations = data?.automations ?? [];

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ paddingTop: 40 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        color="danger"
        iconType="error"
        title={i18n.translate('xpack.nightshift.automations.view.errorTitle', {
          defaultMessage: 'Unable to load automations',
        })}
      >
        <p>{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
      </EuiCallOut>
    );
  }

  if (automations.length === 0) {
    return (
      <>
        <AutomationEmptyState onCreateClick={() => setIsFlyoutOpen(true)} />
        {isFlyoutOpen && (
          <CreateAutomationFlyout onClose={() => setIsFlyoutOpen(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => setIsFlyoutOpen(true)}
            data-test-subj="nightshiftCreateAutomationButton"
          >
            {i18n.translate('xpack.nightshift.automations.view.createButton', {
              defaultMessage: 'Create automation',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="s">
        {automations.map((automation) => (
          <EuiFlexItem key={automation.id}>
            <AutomationListItem automation={automation} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      {isFlyoutOpen && (
        <CreateAutomationFlyout onClose={() => setIsFlyoutOpen(false)} />
      )}
    </>
  );
}
