/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import {
  getAllowedAutonomyLevels,
  type Worker,
  type WorkerSettings,
  type WorkerSettingsWrite,
} from '@kbn/alertzero-common';
import { AutonomySlider } from './autonomy_slider';
import { ScheduleIntervalField } from './schedule_interval_field';
import { SettingsSection } from './settings_section';
import { WorkerSkillsTable } from './worker_skills_table';
import { getWorkerCustomSettingsComponent } from '../custom_settings/registry';
import * as settingsI18n from '../settings_translations';
import { workerName } from '../workers/translations';

interface WorkerSettingsPanelProps {
  worker: Worker;
  enabled: boolean;
  settings: WorkerSettings;
  error?: string;
  /** URL to link from the error message, e.g. a settings page the user must visit to resolve it. */
  errorLink?: string;
  /** Settings could not be read for this Worker; controls are locked and the subtitle says why. */
  settingsLocked: boolean;
  /** A Watch save is in flight; controls are locked so edits cannot slip into a draft about to be cleared. */
  isSaving: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onSettingsChange: (patch: WorkerSettingsWrite) => void;
}

/**
 * One Worker's settings. Every control, shared or Watch-owned, writes into the page draft; the
 * shared page decides what to render from the Worker's settings and declaration alone, so a new
 * Worker-specific field needs no change here.
 */
export const WorkerSettingsPanel: React.FC<WorkerSettingsPanelProps> = ({
  worker,
  enabled,
  settings,
  error,
  errorLink,
  settingsLocked,
  isSaving,
  onEnabledChange,
  onSettingsChange,
}) => {
  const CustomSettings = getWorkerCustomSettingsComponent(worker.id);
  const controlsDisabled = settingsLocked || isSaving;

  return (
    <SettingsSection
      title={workerName(worker.id, worker.name)}
      subtitle={
        settingsLocked
          ? settingsI18n.WORKER_SETTINGS_UNAVAILABLE
          : settingsI18n.WORKER_SECTION_SUBTITLE
      }
      data-test-subj={`alertZeroWatchWorkerSection-${worker.id}`}
    >
      <EuiSwitch
        label={settingsI18n.ENABLED_SWITCH_LABEL}
        checked={enabled}
        disabled={controlsDisabled}
        onChange={(event) => onEnabledChange(event.target.checked)}
        data-test-subj={`alertZeroWorkerEnabledSwitch-${worker.id}`}
      />
      {error ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="danger" data-test-subj={`alertZeroWorkerSaveError-${worker.id}`}>
            <p>
              {error}
              {errorLink ? (
                <>
                  {' '}
                  <EuiLink href={errorLink}>Go to Alert analysis settings</EuiLink>
                </>
              ) : null}
            </p>
          </EuiText>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <AutonomySlider
        current={settings.autonomy}
        levels={getAllowedAutonomyLevels(worker.id)}
        isDisabled={controlsDisabled}
        onChange={(autonomy) => onSettingsChange({ autonomy })}
      />
      {/* Only schedule-driven Workers project an interval; its presence is the signal. */}
      {settings.scheduleInterval != null ? (
        <>
          <EuiSpacer size="m" />
          <ScheduleIntervalField
            current={settings.scheduleInterval}
            isDisabled={controlsDisabled}
            onChange={(scheduleInterval) => onSettingsChange({ scheduleInterval })}
          />
        </>
      ) : null}
      {CustomSettings ? (
        <CustomSettings
          worker={worker}
          settings={settings}
          isDisabled={controlsDisabled}
          onExtrasChange={(extras) => onSettingsChange({ extras })}
        />
      ) : null}
      <EuiSpacer size="m" />
      <WorkerSkillsTable skills={worker.skills} />
    </SettingsSection>
  );
};
