/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiFieldNumber, EuiForm, EuiFormRow, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MIN_EXTRACTION_INTERVAL_HOURS } from '@kbn/significant-events-plugin/common';
import { SettingsSection, SettingsSectionRow } from './settings_section';
import type { DetectionSettingsForm } from './use_detection_settings_form';

export const ContinuousOnboardingSection = ({
  continuousExtraction,
  isActivityToggleDisabled,
  isActivityConfigDisabled,
  activityBlockTooltip,
  isBlocked,
}: {
  continuousExtraction: DetectionSettingsForm['continuousExtraction'];
  isActivityToggleDisabled: boolean;
  isActivityConfigDisabled: DetectionSettingsForm['isActivityConfigDisabled'];
  activityBlockTooltip?: ReactNode;
  isBlocked: boolean;
}) => (
  <SettingsSection
    title={i18n.translate('xpack.nightshift.settings.continuousKiOnboardingTitle', {
      defaultMessage: 'Continuous KI onboarding',
    })}
    data-test-subj="nightshiftContinuousKiOnboardingSection"
  >
    <SettingsSectionRow
      title={i18n.translate('xpack.nightshift.settings.continuousKiOnboardingLabel', {
        defaultMessage: 'Automatic onboarding',
      })}
      description={
        <p>
          {isBlocked
            ? i18n.translate('xpack.nightshift.settings.continuousKiOnboardingPausedHelp', {
                defaultMessage:
                  'Turned off while detection engine activity is paused. Resume above to restore continuous onboarding if it was enabled before pause.',
              })
            : i18n.translate('xpack.nightshift.settings.continuousKiOnboardingHelp', {
                defaultMessage:
                  'Run knowledge indicator onboarding automatically on enabled sources at the configured interval.',
              })}
        </p>
      }
    >
      <EuiForm component="div" fullWidth>
        <EuiFormRow fullWidth>
          <EuiToolTip content={activityBlockTooltip}>
            <EuiSwitch
              data-test-subj="streams-settings-continuous-onboarding-toggle"
              label={i18n.translate('xpack.nightshift.settings.enableContinuousKiOnboarding', {
                defaultMessage: 'Enable continuous KI onboarding',
              })}
              checked={continuousExtraction.draft.enabled}
              onChange={(event) =>
                continuousExtraction.setDraft((previous) => ({
                  ...previous,
                  enabled: event.target.checked,
                }))
              }
              disabled={isActivityToggleDisabled}
            />
          </EuiToolTip>
        </EuiFormRow>
        {continuousExtraction.draft.enabled && (
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.nightshift.settings.onboardingIntervalLabel', {
              defaultMessage: 'Onboarding interval (hours)',
            })}
            helpText={i18n.translate('xpack.nightshift.settings.onboardingIntervalHelp', {
              defaultMessage:
                'Minimum period in hours between onboarding runs for a given stream. Set to 0 for no cooldown between runs.',
            })}
          >
            <EuiFieldNumber
              fullWidth
              compressed
              data-test-subj="streams-settings-onboarding-interval"
              value={continuousExtraction.draft.intervalHours}
              onChange={(event) =>
                continuousExtraction.setDraft((previous) => ({
                  ...previous,
                  intervalHours: Math.max(
                    MIN_EXTRACTION_INTERVAL_HOURS,
                    Number(event.target.value) || 0
                  ),
                }))
              }
              min={MIN_EXTRACTION_INTERVAL_HOURS}
              disabled={isActivityConfigDisabled(continuousExtraction.draft.enabled)}
            />
          </EuiFormRow>
        )}
      </EuiForm>
    </SettingsSectionRow>
  </SettingsSection>
);
