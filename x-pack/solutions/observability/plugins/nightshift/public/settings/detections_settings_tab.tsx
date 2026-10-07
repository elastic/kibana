/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { useKibana } from '../hooks/use_kibana';
import { ContinuousOnboardingSection } from './components/continuous_onboarding_section';
import { CostEstimate } from './components/cost_estimate';
import { DetectionSettingsSaveBar } from './components/detection_settings_save_bar';
import { DeveloperModeBadge } from './components/developer_mode_badge';
import { DeveloperModeSection } from './components/developer_mode_section';
import { MaintenanceSection } from './components/maintenance_section';
import { RunLimitsSection } from './components/run_limits_section';
import { ScheduledDiscoverySection } from './components/scheduled_discovery_section';
import { SettingsSection } from './components/settings_section';
import { SettingsNoPermissionCallout } from './components/settings_no_permission_callout';
import { StaleEventCleanupSection } from './components/stale_event_cleanup_section';
import { TuningSection } from './components/tuning_section';
import { useDetectionSettingsForm } from './components/use_detection_settings_form';

export const DetectionsSettingsTab = () => {
  const { appParams, application, http, overlays } = useKibana().services;
  const form = useDetectionSettingsForm();
  const [hasRunLimitChanges, setHasRunLimitChanges] = useState(false);

  useUnsavedChangesPrompt({
    hasUnsavedChanges: form.hasChanges || hasRunLimitChanges,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl: application.navigateToUrl,
    history: appParams.history,
    shouldPromptOnReplace: false,
  });

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
          groups={['detection', 'ki_extraction']}
          onUnsavedChangesChange={setHasRunLimitChanges}
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

      <DeveloperModeSection
        isDeveloperMode={form.isDeveloperMode}
        setDeveloperMode={form.setDeveloperMode}
        isDeveloperModeSaving={form.isDeveloperModeSaving}
        canSaveAdvancedSettings={form.canSaveAdvancedSettings}
        isSaving={form.isSaving || form.isSavingTuningConfig}
      />

      {form.isDeveloperMode && (
        <>
          <EuiSpacer />
          <SettingsSection
            title={i18n.translate('xpack.nightshift.settings.advancedDeveloperSettingsTitle', {
              defaultMessage: 'Advanced developer settings',
            })}
            titleAdornment={<DeveloperModeBadge />}
            data-test-subj="nightshiftAdvancedDeveloperSettingsSection"
          >
            <StaleEventCleanupSection canManage={form.canManage} />

            <EuiHorizontalRule margin="l" />

            <CostEstimate />

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
      )}

      <EuiSpacer />

      <DetectionSettingsSaveBar
        hasChanges={form.hasActivitySettingsChanges}
        isSaving={form.isSaving || form.isSavingTuningConfig}
        handleCancel={form.handleCancel}
        handleSave={form.handleSave}
        canEditSettings={form.canEditSettings}
        isDeveloperModeSaving={form.isDeveloperModeSaving}
        saveBlockedByPause={form.saveBlockedByPause}
        activityBlockTooltip={form.activityBlockTooltip}
      />
    </>
  );
};
