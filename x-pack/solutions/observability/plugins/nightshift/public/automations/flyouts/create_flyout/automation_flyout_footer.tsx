/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const labels = {
  enabled: i18n.translate('xpack.nightshift.automations.flyout.enabled', {
    defaultMessage: 'Enabled',
  }),
  disabled: i18n.translate('xpack.nightshift.automations.flyout.disabled', {
    defaultMessage: 'Disabled',
  }),
  savesAsDisabled: i18n.translate('xpack.nightshift.automations.flyout.savesAsDisabled', {
    defaultMessage: 'Saves as disabled',
  }),
  enablesWhenSaved: i18n.translate('xpack.nightshift.automations.flyout.enablesWhenSaved', {
    defaultMessage: 'Enables when saved',
  }),
  save: i18n.translate('xpack.nightshift.automations.flyout.save', { defaultMessage: 'Save' }),
};

export const AutomationFlyoutFooter = ({
  isEnabled,
  canSave,
  isSaving,
  saveBlocker,
  onEnabledChange,
  onSave,
}: {
  isEnabled: boolean;
  canSave: boolean;
  isSaving: boolean;
  saveBlocker?: string;
  onEnabledChange: (isEnabled: boolean) => void;
  onSave: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const saveButton = (
    <EuiButton
      fill
      size="s"
      isDisabled={!canSave}
      isLoading={isSaving}
      onClick={onSave}
      data-test-subj="submitAutomation"
    >
      {labels.save}
    </EuiButton>
  );

  return (
    <footer
      css={{
        flexShrink: 0,
        padding: euiTheme.size.m,
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        borderBlockStart: euiTheme.border.thin,
      }}
    >
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                compressed
                label={isEnabled ? labels.enabled : labels.disabled}
                checked={isEnabled}
                onChange={(event) => onEnabledChange(event.target.checked)}
                data-test-subj="automationEnabledSwitch"
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              css={{
                paddingInlineEnd: euiTheme.size.m,
                borderInlineEnd: euiTheme.border.thin,
              }}
            >
              <EuiText size="xs" color="subdued">
                {isEnabled ? labels.enablesWhenSaved : labels.savesAsDisabled}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {saveBlocker ? (
                <EuiToolTip content={saveBlocker}>{saveButton}</EuiToolTip>
              ) : (
                saveButton
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </footer>
  );
};
