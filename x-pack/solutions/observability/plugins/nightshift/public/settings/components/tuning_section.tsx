/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import { SignificantEventsTuningConfigEditor } from './significant_events_tuning_config_editor';
import { SettingsSectionRow } from './settings_section';
import type { DetectionSettingsForm } from './use_detection_settings_form';

export const TuningSection = ({
  draftConfigYaml,
  setDraftConfigYaml,
  setParsedTuningConfig,
  canEditSettings,
  hasTuningConfigChanges,
  parsedTuningConfig,
  isSavingTuningConfig,
  handleResetTuningConfig,
  handleCancelTuningConfig,
  handleSaveTuningConfig,
}: {
  draftConfigYaml: string;
  setDraftConfigYaml: DetectionSettingsForm['setDraftConfigYaml'];
  setParsedTuningConfig: DetectionSettingsForm['setParsedTuningConfig'];
  canEditSettings: boolean;
  hasTuningConfigChanges: boolean;
  parsedTuningConfig: DetectionSettingsForm['parsedTuningConfig'];
  isSavingTuningConfig: boolean;
  handleResetTuningConfig: DetectionSettingsForm['handleResetTuningConfig'];
  handleCancelTuningConfig: DetectionSettingsForm['handleCancelTuningConfig'];
  handleSaveTuningConfig: DetectionSettingsForm['handleSaveTuningConfig'];
}) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'nightshiftSettingsTuningFlyoutTitle',
  });

  const closeFlyout = () => {
    handleCancelTuningConfig();
    setIsFlyoutOpen(false);
  };

  const saveTuningConfig = async () => {
    if (await handleSaveTuningConfig()) {
      setIsFlyoutOpen(false);
    }
  };

  return (
    <>
      <SettingsSectionRow
        title={i18n.translate('xpack.nightshift.settings.tuningTitle', {
          defaultMessage: 'Significant events tuning',
        })}
        description={
          <p>
            {i18n.translate('xpack.nightshift.settings.tuningInfo', {
              defaultMessage:
                'These settings control how features are discovered and queries are searched. Incorrect values may degrade onboarding quality or cause unexpected behavior.',
            })}
          </p>
        }
        data-test-subj="nightshiftSettingsTuningPanel"
      >
        <EuiButton
          size="s"
          iconType="pencil"
          onClick={() => setIsFlyoutOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isFlyoutOpen}
          data-test-subj="nightshiftSettingsTuningEditButton"
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.EDIT_TUNING_DOCUMENT,
            element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
          })}
        >
          {i18n.translate('xpack.nightshift.settings.editTuningDocument', {
            defaultMessage: 'Edit tuning document',
          })}
        </EuiButton>
      </SettingsSectionRow>

      {isFlyoutOpen && (
        <EuiFlyout
          type="push"
          ownFocus={false}
          size="50%"
          onClose={closeFlyout}
          aria-labelledby={flyoutTitleId}
          data-test-subj="nightshiftSettingsTuningFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id={flyoutTitleId}>
                {i18n.translate('xpack.nightshift.settings.tuningFlyoutTitle', {
                  defaultMessage: 'Significant events tuning',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <SignificantEventsTuningConfigEditor
              value={draftConfigYaml}
              isReadOnly={!canEditSettings}
              onChange={(yaml, parsed) => {
                setDraftConfigYaml(yaml);
                setParsedTuningConfig(parsed);
              }}
            />
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="nightshiftSettingsTuningResetToDefaultsButton"
                  size="s"
                  iconType="refresh"
                  isDisabled={!canEditSettings || isSavingTuningConfig}
                  onClick={handleResetTuningConfig}
                  {...getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.RESET_TUNING_DOCUMENT,
                    element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
                  })}
                >
                  {i18n.translate('xpack.nightshift.settings.resetToDefaults', {
                    defaultMessage: 'Reset to defaults',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  size="s"
                  isLoading={isSavingTuningConfig}
                  isDisabled={
                    !canEditSettings || !hasTuningConfigChanges || parsedTuningConfig === null
                  }
                  onClick={() => void saveTuningConfig()}
                  data-test-subj="nightshiftSettingsTuningSaveButton"
                  {...getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.SAVE_TUNING_DOCUMENT,
                    element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
                  })}
                >
                  {i18n.translate('xpack.nightshift.settings.saveTuningButton', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
};
