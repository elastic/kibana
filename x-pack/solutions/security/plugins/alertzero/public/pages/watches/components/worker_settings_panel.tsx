/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { Worker, WorkerSettings, WorkerSettingsWrite } from '@kbn/alertzero-common';
import { AutonomySlider } from './autonomy_slider';
import { ScheduleIntervalField } from './schedule_interval_field';
import { SettingsSection } from './settings_section';
import { WorkerSkillsTable } from './worker_skills_table';
import { getWatchCustomSettingsComponent } from '../custom_settings/registry';
import * as settingsI18n from '../settings_translations';
import { workerName } from '../workers/translations';

interface WorkerSettingsPanelProps {
  worker: Worker;
  enabled: boolean;
  settings: WorkerSettings;
  dirty: boolean;
  error?: string;
  settingsLocked: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onSettingsChange: (patch: WorkerSettingsWrite) => void;
}

export const WorkerSettingsPanel: React.FC<WorkerSettingsPanelProps> = ({
  worker,
  enabled,
  settings,
  dirty,
  error,
  settingsLocked,
  onEnabledChange,
  onSettingsChange,
}) => {
  const CustomSettings = worker.watchIds
    .map((watchId) => getWatchCustomSettingsComponent(watchId))
    .find((component) => component != null);

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
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={settingsI18n.ENABLED_SWITCH_LABEL}
            checked={enabled}
            disabled={settingsLocked}
            onChange={(event) => onEnabledChange(event.target.checked)}
            data-test-subj={`alertZeroWorkerEnabledSwitch-${worker.id}`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={dirty ? settingsI18n.RUN_WORKER_DIRTY : undefined}>
            <EuiButtonEmpty
              size="s"
              disabled={dirty || settingsLocked}
              data-test-subj={`alertZeroWorkerRun-${worker.id}`}
            >
              {settingsI18n.RUN_WORKER}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      {error ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="danger" data-test-subj={`alertZeroWorkerSaveError-${worker.id}`}>
            <p>{settingsI18n.WORKER_SETTINGS_SAVE_ERROR}</p>
          </EuiText>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <AutonomySlider
        current={settings.autonomy}
        isDisabled={settingsLocked}
        onChange={(autonomy) => onSettingsChange({ autonomy })}
      />
      {settings.scheduleInterval != null ? (
        <>
          <EuiSpacer size="m" />
          <ScheduleIntervalField
            current={settings.scheduleInterval}
            isDisabled={settingsLocked}
            onChange={(scheduleInterval) => onSettingsChange({ scheduleInterval })}
          />
        </>
      ) : null}
      {CustomSettings ? (
        <CustomSettings
          worker={worker}
          settings={settings}
          isDisabled={settingsLocked}
          onSettingsChange={onSettingsChange}
        />
      ) : null}
      <EuiSpacer size="m" />
      <WorkerSkillsTable skills={worker.skills} />
    </SettingsSection>
  );
};
