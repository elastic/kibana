/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const labels = {
  save: i18n.translate('xpack.nightshift.automations.flyout.save', { defaultMessage: 'Save' }),
  saveAndEnable: i18n.translate('xpack.nightshift.automations.flyout.saveAndEnable', {
    defaultMessage: 'Save and enable',
  }),
};

export const AutomationFlyoutFooter = ({
  canSave,
  isSaving,
  saveBlocker,
  onSave,
}: {
  canSave: boolean;
  isSaving: boolean;
  saveBlocker?: string;
  onSave: (isEnabled: boolean) => void;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <footer
      css={{
        flexShrink: 0,
        padding: euiTheme.size.m,
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        borderBlockStart: euiTheme.border.thin,
      }}
    >
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        {[
          { label: labels.save, isEnabled: false, testSubject: 'submitAutomation' },
          {
            label: labels.saveAndEnable,
            isEnabled: true,
            testSubject: 'submitAndEnableAutomation',
          },
        ].map(({ label, isEnabled, testSubject }) => (
          <EuiFlexItem key={testSubject} grow={false}>
            <EuiToolTip content={saveBlocker}>
              <EuiButton
                fill={isEnabled}
                size="s"
                isDisabled={!canSave}
                isLoading={isSaving}
                onClick={() => onSave(isEnabled)}
                data-test-subj={testSubject}
              >
                {label}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </footer>
  );
};
