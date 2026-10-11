/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DetectionSettingsSaveBar = ({
  hasChanges,
  isSaving,
  handleCancel,
  handleSave,
  canEditSettings,
  isDeveloperModeSaving,
  saveBlockedByPause,
  activityBlockTooltip,
}: {
  hasChanges: boolean;
  isSaving: boolean;
  handleCancel: () => void;
  handleSave: () => void;
  canEditSettings: boolean;
  isDeveloperModeSaving: boolean;
  saveBlockedByPause: boolean;
  activityBlockTooltip?: ReactNode;
}) =>
  hasChanges ? (
    <EuiBottomBar data-test-subj="streams-significant-events-settings-bottom-bar">
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="streams-settings-cancel-button"
                color="text"
                size="s"
                onClick={handleCancel}
                isDisabled={isSaving}
              >
                {i18n.translate('xpack.nightshift.settings.cancelButton', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={saveBlockedByPause ? activityBlockTooltip : undefined}>
                <EuiButton
                  data-test-subj="streams-settings-save-button"
                  color="primary"
                  fill
                  size="s"
                  onClick={handleSave}
                  isLoading={isSaving}
                  isDisabled={!canEditSettings || isDeveloperModeSaving || saveBlockedByPause}
                  hasAriaDisabled={saveBlockedByPause}
                >
                  {i18n.translate('xpack.nightshift.settings.saveChangesButton', {
                    defaultMessage: 'Save changes',
                  })}
                </EuiButton>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  ) : null;
