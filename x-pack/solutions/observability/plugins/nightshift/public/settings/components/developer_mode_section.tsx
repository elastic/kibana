/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiForm, EuiFormRow, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SettingsSection, SettingsSectionRow } from './settings_section';
import type { DetectionSettingsForm } from './use_detection_settings_form';

export const DeveloperModeSection = ({
  isDeveloperMode,
  setDeveloperMode,
  isDeveloperModeSaving,
  canSaveAdvancedSettings,
  isSaving,
}: {
  isDeveloperMode: boolean;
  setDeveloperMode: DetectionSettingsForm['setDeveloperMode'];
  isDeveloperModeSaving: boolean;
  canSaveAdvancedSettings: boolean;
  isSaving: boolean;
}) => (
  <SettingsSection
    title={i18n.translate('xpack.nightshift.settings.developerModeTitle', {
      defaultMessage: 'Nightshift developer mode',
    })}
    data-test-subj="nightshiftDeveloperModeSection"
  >
    <SettingsSectionRow
      title={i18n.translate('xpack.nightshift.settings.developerModeFeaturesTitle', {
        defaultMessage: 'Developer features',
      })}
      description={
        <p>
          {i18n.translate('xpack.nightshift.settings.developerModeHelpText', {
            defaultMessage: 'Show extra details and configuration options for expert users.',
          })}
        </p>
      }
    >
      <EuiForm component="div" fullWidth>
        <EuiFormRow fullWidth>
          <EuiSwitch
            data-test-subj="nightshiftDeveloperModeSwitch"
            label={i18n.translate('xpack.nightshift.settings.developerModeToggleSwitch', {
              defaultMessage: 'Enable Nightshift developer mode',
            })}
            checked={isDeveloperMode}
            onChange={(event) => {
              void setDeveloperMode(event.target.checked);
            }}
            disabled={!canSaveAdvancedSettings || isDeveloperModeSaving || isSaving}
          />
        </EuiFormRow>
      </EuiForm>
    </SettingsSectionRow>
  </SettingsSection>
);
