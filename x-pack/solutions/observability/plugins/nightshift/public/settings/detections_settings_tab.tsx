/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { useKibana } from '../hooks/use_kibana';
import { ContinuousOnboardingSection } from './components/continuous_onboarding_section';
import { CostEstimate } from './components/cost_estimate';
import { DeveloperModeBadge } from './components/developer_mode_badge';
import { MaintenanceSection } from './components/maintenance_section';
import { RunLimitsSection } from './components/run_limits_section';
import { ScheduledDiscoverySection } from './components/scheduled_discovery_section';
import { SettingsSaveBar } from './components/settings_save_bar';
import { SettingsSection } from './components/settings_section';
import { SettingsNoPermissionCallout } from './components/settings_no_permission_callout';
import { StaleEventCleanupSection } from './components/stale_event_cleanup_section';
import { TuningSection } from './components/tuning_section';
import { useDetectionSettingsForm } from './components/use_detection_settings_form';
import { useRunLimitsForm } from './components/use_run_limits_form';
import { useTokenTrackingForm } from './components/use_token_tracking_form';

const DETECTION_RUN_LIMIT_GROUPS = ['detection', 'ki_extraction'] as const;

export const DetectionsSettingsTab = () => {
  const { appParams, application, http, overlays } = useKibana().services;
  const form = useDetectionSettingsForm();
  const runLimits = useRunLimitsForm({ groups: DETECTION_RUN_LIMIT_GROUPS });
  const tokenTracking = useTokenTrackingForm({
    isEnabled: form.isDeveloperMode && !form.isDeveloperModeSaving && runLimits.canManage,
  });

  useUnsavedChangesPrompt({
    hasUnsavedChanges: form.hasChanges || runLimits.isDirty || tokenTracking.isDirty,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl: application.navigateToUrl,
    history: appParams.history,
    shouldPromptOnReplace: false,
  });

  const saveRemainingSettings = async () => {
    if (form.hasActivitySettingsChanges) {
      const result = await form.handleSave();
      if (result === 'failed') {
        return;
      }
    }
    if (tokenTracking.isDirty) {
      await tokenTracking.save();
    }
  };

  const saveSettings = async () => {
    if (runLimits.isDirty) {
      const result = await runLimits.requestSave();
      if (result === 'needs-confirmation' || result === 'failed') {
        return;
      }
    }

    await saveRemainingSettings();
  };

  const confirmRunLimitsAndSaveSettings = async () => {
    const result = await runLimits.confirmAndSave();
    if (result === 'saved') {
      await saveRemainingSettings();
    }
  };

  const cancelSettings = () => {
    runLimits.cancel();
    form.handleCancel();
    tokenTracking.cancel();
  };

  const hasSaveBarChanges =
    form.hasActivitySettingsChanges || runLimits.isDirty || tokenTracking.isDirty;
  const activitySaveBlockedByPause = form.hasActivitySettingsChanges && form.saveBlockedByPause;
  const isSaveDisabled =
    form.isDeveloperModeSaving ||
    activitySaveBlockedByPause ||
    (runLimits.isDirty && (!runLimits.canManage || !runLimits.update)) ||
    (tokenTracking.isDirty && !tokenTracking.canEdit);

  return (
    <>
      {!form.canEditSettings && <SettingsNoPermissionCallout />}
      <SettingsSection
        title={i18n.translate('xpack.nightshift.settings.detectionProcessTitle', {
          defaultMessage: 'Detection process',
        })}
        data-test-subj="nightshiftDetectionProcessSection"
      >
        <MaintenanceSection canManage={form.canManageAndConfigure} />

        <EuiHorizontalRule margin="l" />

        <ScheduledDiscoverySection
          scheduledDiscovery={form.scheduledDiscovery}
          isActivityToggleDisabled={form.isActivityToggleDisabled}
          isActivityConfigDisabled={form.isActivityConfigDisabled}
          activityBlockTooltip={form.activityBlockTooltip}
          isBlocked={form.isBlocked}
        />

        <EuiHorizontalRule margin="l" />

        <RunLimitsSection
          groups={DETECTION_RUN_LIMIT_GROUPS}
          form={runLimits}
          description={i18n.translate('xpack.nightshift.settings.detectionRunLimitsDescription', {
            defaultMessage:
              'These limits apply only to scheduled detection, manual runs are not limited. When a limit is reached, new scheduled runs are blocked until it resets.',
          })}
          onSave={saveSettings}
          onConfirmSave={confirmRunLimitsAndSaveSettings}
        />
      </SettingsSection>

      <EuiSpacer />

      <ContinuousOnboardingSection
        continuousExtraction={form.continuousExtraction}
        isActivityToggleDisabled={form.isActivityToggleDisabled}
        isActivityConfigDisabled={form.isActivityConfigDisabled}
        activityBlockTooltip={form.activityBlockTooltip}
        isBlocked={form.isBlocked}
      />

      <EuiSpacer />

      {form.isDeveloperMode ? (
        <>
          <SettingsSection
            title={i18n.translate('xpack.nightshift.settings.advancedDeveloperSettingsTitle', {
              defaultMessage: 'Advanced developer settings',
            })}
            titleAdornment={<DeveloperModeBadge />}
            data-test-subj="nightshiftAdvancedDeveloperSettingsSection"
          >
            <StaleEventCleanupSection canManage={form.canManage} />

            <EuiHorizontalRule margin="l" />

            <CostEstimate tokenTracking={tokenTracking} />

            {!form.isDeveloperModeSaving && (
              <>
                <EuiHorizontalRule margin="l" />
                <TuningSection
                  draftConfigYaml={form.draftConfigYaml}
                  setDraftConfigYaml={form.setDraftConfigYaml}
                  setParsedTuningConfig={form.setParsedTuningConfig}
                  canEditSettings={form.canEditSettings}
                  hasTuningConfigChanges={form.hasTuningConfigChanges}
                  parsedTuningConfig={form.parsedTuningConfig}
                  isSavingTuningConfig={form.isSavingTuningConfig}
                  handleResetTuningConfig={form.handleResetTuningConfig}
                  handleCancelTuningConfig={form.handleCancelTuningConfig}
                  handleSaveTuningConfig={form.handleSaveTuningConfig}
                />
              </>
            )}
          </SettingsSection>
        </>
      ) : null}

      <SettingsSaveBar
        hasChanges={hasSaveBarChanges}
        isSaving={
          form.isSaving || form.isSavingTuningConfig || runLimits.isSaving || tokenTracking.isSaving
        }
        onCancel={cancelSettings}
        onSave={saveSettings}
        isSaveDisabled={isSaveDisabled}
        disabledTooltip={activitySaveBlockedByPause ? form.activityBlockTooltip : undefined}
      />
    </>
  );
};
