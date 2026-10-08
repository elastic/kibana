/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/management-settings-ids';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  resolveSignificantEventsTuningConfig,
  type SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import { useDeveloperMode } from '../hooks/use_developer_mode';
import { useKibana } from '../../hooks/use_kibana';
import { useBlocksNewActivity } from '../hooks/use_significant_events_maintenance';
import { getFormattedError } from '../utils/errors';
import { configToAnnotatedYaml } from './significant_events_tuning_config_editor';
import { useContinuousExtractionSettings } from './use_continuous_extraction_settings';
import { useScheduledDiscoverySettings } from './use_scheduled_discovery_settings';

const useSettingsPermissions = () => {
  const { application } = useKibana().services;
  const { canManage, canManageAndConfigure } = getNightshiftCapabilities(
    application.capabilities.nightshift
  );
  const canSaveAdvancedSettings = application.capabilities.advancedSettings?.save === true;

  return {
    canManage,
    canManageAndConfigure,
    canSaveAdvancedSettings,
    canEditSettings: canManageAndConfigure && canSaveAdvancedSettings,
  };
};

export const useDetectionSettingsForm = () => {
  const core = useKibana().services;

  // Saving these settings hits Nightshift engine routes and core's UI settings
  // routes used by `core.settings.client` / `globalClient` (require
  // `advancedSettings.save`). Gate each section on the engine that owns it so
  // the user never triggers a partial save that 403s halfway through.
  const { canManage, canManageAndConfigure, canSaveAdvancedSettings, canEditSettings } =
    useSettingsPermissions();
  const { isDeveloperMode, isSaving: isDeveloperModeSaving } = useDeveloperMode();

  // Pause turns these Settings toggles off (and Resume restores only those that
  // were previously on). While paused, the toggles are not editable.
  // `blocksActivity` is also true while status is loading (pessimistic).
  const {
    blocksActivity,
    isBlocked,
    status: maintenanceStatus,
    activityBlockTooltip,
  } = useBlocksNewActivity();
  const isActivityToggleDisabled = !canEditSettings || blocksActivity;
  const isActivityConfigDisabled = (draftEnabled: boolean) =>
    !canEditSettings || !draftEnabled || blocksActivity;

  const continuousExtraction = useContinuousExtractionSettings({
    globalClient: core.settings.globalClient,
    http: core.http,
    enabledFromStatus: maintenanceStatus?.featureSettings?.continuousOnboardingEnabled,
  });
  const scheduledDiscovery = useScheduledDiscoverySettings({
    client: core.settings.client,
    http: core.http,
    enabledFromStatus: maintenanceStatus?.featureSettings?.scheduledDiscoveryEnabled,
  });

  // Dirty continuous/scheduled changes are blocked while paused (server 409).
  const activitySettingsDirty =
    canEditSettings && (scheduledDiscovery.hasChanged || continuousExtraction.hasChanged);
  const saveBlockedByPause = blocksActivity && activitySettingsDirty;

  const [savedConfigYamlState, setSavedConfigYamlState] = useState<string>(() => {
    try {
      const raw = core.settings.globalClient.get<unknown>(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG,
        DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG
      );
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return configToAnnotatedYaml(resolveSignificantEventsTuningConfig(parsed));
    } catch {
      return configToAnnotatedYaml(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    }
  });

  const [draftConfigYaml, setDraftConfigYaml] = useState<string>(savedConfigYamlState);
  const [parsedTuningConfig, setParsedTuningConfig] =
    useState<SignificantEventsTuningConfig | null>(null);

  useEffect(() => {
    if (!isDeveloperMode && !isDeveloperModeSaving) {
      setDraftConfigYaml(savedConfigYamlState);
      setParsedTuningConfig(null);
    }
  }, [isDeveloperMode, isDeveloperModeSaving, savedConfigYamlState]);

  const [isSaving, setIsSaving] = useState(false);

  const hasTuningConfigChanges =
    isDeveloperMode && !isDeveloperModeSaving && draftConfigYaml !== savedConfigYamlState;
  const hasActivitySettingsChanges =
    canEditSettings && (continuousExtraction.hasChanged || scheduledDiscovery.hasChanged);
  const hasChanges = hasActivitySettingsChanges || (canEditSettings && hasTuningConfigChanges);

  const handleResetTuningConfig = useCallback(() => {
    const defaultYaml = configToAnnotatedYaml(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    setDraftConfigYaml(defaultYaml);
    setParsedTuningConfig(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
  }, []);

  const handleCancelTuningConfig = useCallback(() => {
    setDraftConfigYaml(savedConfigYamlState);
    setParsedTuningConfig(null);
  }, [savedConfigYamlState]);

  const handleCancel = useCallback(() => {
    continuousExtraction.reset();
    scheduledDiscovery.reset();
  }, [continuousExtraction, scheduledDiscovery]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (canEditSettings && continuousExtraction.hasChanged) {
        await continuousExtraction.save();
      }

      if (canEditSettings && scheduledDiscovery.hasChanged) {
        await scheduledDiscovery.save();
      }
    } catch (err) {
      core.notifications.toasts.addDanger({
        title: i18n.translate('xpack.nightshift.settings.saveErrorTitle', {
          defaultMessage: 'Failed to save settings',
        }),
        text: getFormattedError(err).message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [core.notifications.toasts, continuousExtraction, scheduledDiscovery, canEditSettings]);

  const [isSavingTuningConfig, setIsSavingTuningConfig] = useState(false);

  const handleSaveTuningConfig = useCallback(async (): Promise<boolean> => {
    if (
      !canEditSettings ||
      !isDeveloperMode ||
      isDeveloperModeSaving ||
      !hasTuningConfigChanges ||
      !parsedTuningConfig
    ) {
      return false;
    }

    setIsSavingTuningConfig(true);
    try {
      const fullConfig = { ...DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG, ...parsedTuningConfig };
      const wasSaved = await core.settings.globalClient.set(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG,
        JSON.stringify(fullConfig)
      );
      if (!wasSaved) {
        throw new Error(
          i18n.translate('xpack.nightshift.settings.saveTuningRejectedError', {
            defaultMessage: 'The tuning settings could not be saved.',
          })
        );
      }
      const newSavedYaml = configToAnnotatedYaml(fullConfig);
      setSavedConfigYamlState(newSavedYaml);
      setDraftConfigYaml(newSavedYaml);
      setParsedTuningConfig(null);
      return true;
    } catch (err) {
      core.notifications.toasts.addDanger({
        title: i18n.translate('xpack.nightshift.settings.saveTuningErrorTitle', {
          defaultMessage: 'Failed to save tuning settings',
        }),
        text: getFormattedError(err).message,
      });
      return false;
    } finally {
      setIsSavingTuningConfig(false);
    }
  }, [
    canEditSettings,
    isDeveloperMode,
    isDeveloperModeSaving,
    hasTuningConfigChanges,
    parsedTuningConfig,
    core.settings.globalClient,
    core.notifications.toasts,
  ]);

  return {
    canEditSettings,
    canManage,
    canManageAndConfigure,
    canSaveAdvancedSettings,
    isDeveloperMode,
    isDeveloperModeSaving,
    isBlocked,
    activityBlockTooltip,
    isActivityToggleDisabled,
    isActivityConfigDisabled,
    continuousExtraction,
    scheduledDiscovery,
    saveBlockedByPause,
    draftConfigYaml,
    setDraftConfigYaml,
    parsedTuningConfig,
    setParsedTuningConfig,
    isSaving,
    isSavingTuningConfig,
    hasTuningConfigChanges,
    hasActivitySettingsChanges,
    hasChanges,
    handleResetTuningConfig,
    handleCancelTuningConfig,
    handleCancel,
    handleSave,
    handleSaveTuningConfig,
  };
};

export type DetectionSettingsForm = ReturnType<typeof useDetectionSettingsForm>;
