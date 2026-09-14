/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiSwitch } from '@elastic/eui';
import { WATCH_AUTONOMY_LEVELS, type Worker } from '@kbn/alertzero-common';
import { useUpdateWorker } from '../../../hooks/use_workers_api';
import { AutonomySlider } from './autonomy_slider';
import { ScheduleIntervalField } from './schedule_interval_field';
import { SettingsSection } from './settings_section';
import { WorkerSkillsTable } from './worker_skills_table';
import { workerSettingsExtrasById } from './worker_settings_extras';
import * as settingsI18n from '../settings_translations';
import { workerName } from '../workers/translations';

interface WorkerSettingsCardProps {
  worker: Worker;
}

/**
 * Shared Worker settings shell. Enable, autonomy, and schedule are common; unique UX is
 * looked up from `workerSettingsExtrasById` so this file never switches on worker id.
 */
export const WorkerSettingsCard: React.FC<WorkerSettingsCardProps> = ({ worker }) => {
  const { mutate: updateWorker } = useUpdateWorker();
  const settingsLocked = worker.state === 'unavailable';
  const Extras = workerSettingsExtrasById[worker.id];
  const allowedLevels = worker.settings.allowedAutonomyLevels ?? WATCH_AUTONOMY_LEVELS;

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
        checked={worker.enabled}
        disabled={settingsLocked}
        onChange={(event) =>
          updateWorker({ workerId: worker.id, patch: { enabled: event.target.checked } })
        }
        data-test-subj={`alertZeroWorkerEnabledSwitch-${worker.id}`}
      />
      <EuiSpacer size="m" />
      <AutonomySlider
        current={worker.settings.autonomy}
        levels={allowedLevels}
        isDisabled={settingsLocked}
        onChange={(autonomyLevel) =>
          updateWorker({ workerId: worker.id, patch: { autonomyLevel } })
        }
      />
      {worker.settings.scheduleInterval != null ? (
        <>
          <EuiSpacer size="m" />
          <ScheduleIntervalField
            current={worker.settings.scheduleInterval}
            isDisabled={settingsLocked}
            onChange={(scheduleInterval) =>
              updateWorker({ workerId: worker.id, patch: { scheduleInterval } })
            }
          />
        </>
      ) : null}
      {Extras ? (
        <Extras
          worker={worker}
          isDisabled={settingsLocked}
          onPatch={(patch) => updateWorker({ workerId: worker.id, patch })}
        />
      ) : null}
      <EuiSpacer size="m" />
      <WorkerSkillsTable skills={worker.skills} />
    </SettingsSection>
  );
};
