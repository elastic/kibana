/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  getAllowedAutonomyLevels,
  type Worker,
  type WorkerSettings,
  type WorkerSettingsWrite,
} from '@kbn/alertzero-common';
import { AutonomyLevelControl } from './autonomy_level_control';
import { ScheduleIntervalField } from './schedule_interval_field';
import { WorkerSkillsTable } from './worker_skills_table';
import { getWorkerCustomSettingsComponent } from '../custom_settings/registry';
import * as settingsI18n from '../settings_translations';
import { workerName } from '../workers/translations';

interface WorkerSettingsPanelProps {
  worker: Worker;
  /** Accordion when a Watch has several Workers; a static panel when it has exactly one. */
  isAccordion: boolean;
  isExpanded: boolean;
  onToggle: (workerId: string, isOpen: boolean) => void;
  enabled: boolean;
  settings: WorkerSettings;
  error?: string;
  /** Settings could not be read for this Worker; controls are locked and the subtitle says why. */
  settingsLocked: boolean;
  /** A Watch save is in flight; controls are locked so edits cannot slip into a draft about to be cleared. */
  isSaving: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onSettingsChange: (patch: WorkerSettingsWrite) => void;
}

/**
 * A single Worker's settings in the two-column layout. The header (name, autonomy/schedule badges,
 * enabled switch) doubles as the accordion button when a Watch has several Workers, so collapsed
 * panels still summarise their state. Memoized: scroll-spy updates in the parent must not
 * re-render every Worker's settings.
 *
 * Every control, shared or Watch-owned, writes into the page draft; the page decides what to
 * render from the Worker's settings and declaration alone, so a new Worker-specific field needs
 * no change here. Save and Discard live on the page header, not on the panel.
 */
export const WorkerSettingsPanel = React.memo(function WorkerSettingsPanel({
  worker,
  isAccordion,
  isExpanded,
  onToggle,
  enabled,
  settings,
  error,
  settingsLocked,
  isSaving,
  onEnabledChange,
  onSettingsChange,
}: WorkerSettingsPanelProps) {
  const { euiTheme } = useEuiTheme();
  const name = workerName(worker.id, worker.name);
  const controlsDisabled = settingsLocked || isSaving;
  const CustomSettings = getWorkerCustomSettingsComponent(worker.id);

  const accordionCss = useMemo(
    () => css`
      .euiAccordion__triggerWrapper {
        align-items: center;
        padding: ${euiTheme.size.base};
        /* Full-width rule under the header, mirroring the static single-Worker band. */
        border-bottom: ${isExpanded ? euiTheme.border.thin : 'none'};
      }
      .euiAccordion__children {
        padding: ${euiTheme.size.base};
      }
    `,
    [euiTheme, isExpanded]
  );

  const enabledSwitch = (
    <EuiSwitch
      label={settingsI18n.ENABLED_SWITCH_LABEL}
      checked={enabled}
      disabled={controlsDisabled}
      onChange={(event) => onEnabledChange(event.target.checked)}
      data-test-subj={`alertZeroWorkerEnabledSwitch-${worker.id}`}
    />
  );

  const settingsBody = (
    <>
      {settingsLocked ? (
        <EuiText size="s" color="subdued">
          <p>{settingsI18n.WORKER_SETTINGS_UNAVAILABLE}</p>
        </EuiText>
      ) : null}
      {error ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="danger" data-test-subj={`alertZeroWorkerSaveError-${worker.id}`}>
            <p>{settingsI18n.WORKER_SETTINGS_SAVE_ERROR}</p>
          </EuiText>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <AutonomyLevelControl
        workerId={worker.id}
        current={settings.autonomy}
        allowedAutonomyLevels={getAllowedAutonomyLevels(worker.id)}
        isDisabled={controlsDisabled}
        onChange={(autonomy) => onSettingsChange({ autonomy })}
      />
      {/* Only schedule-driven Workers project an interval; its presence is the signal. */}
      {settings.scheduleInterval != null ? (
        <>
          <EuiSpacer size="m" />
          <ScheduleIntervalField
            workerId={worker.id}
            current={settings.scheduleInterval}
            isDisabled={controlsDisabled}
            onChange={(scheduleInterval) => onSettingsChange({ scheduleInterval })}
          />
        </>
      ) : null}
      {/* Watch-owned settings for this Worker's `extras`; extras replaces whole-object on save. */}
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
    </>
  );

  const collapsedBadges = !isExpanded ? (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{settingsI18n.autonomyLevelName(settings.autonomy)}</EuiBadge>
      </EuiFlexItem>
      {settings.scheduleInterval != null ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {settingsI18n.SCHEDULE_INTERVAL_LABEL} {settings.scheduleInterval}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  ) : null;

  if (isAccordion) {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="none">
        <EuiAccordion
          id={`${worker.id}-settings`}
          arrowDisplay="left"
          paddingSize="none"
          forceState={isExpanded ? 'open' : 'closed'}
          onToggle={(isOpen) => onToggle(worker.id, isOpen)}
          buttonContent={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <span id={`${worker.id}-heading`}>{name}</span>
                </EuiTitle>
              </EuiFlexItem>
              {collapsedBadges}
            </EuiFlexGroup>
          }
          extraAction={enabledSwitch}
          data-test-subj={`alertZeroWatchWorkerAccordion-${worker.id}`}
          css={accordionCss}
        >
          {settingsBody}
        </EuiAccordion>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="l">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span id={`${worker.id}-heading`}>{name}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{enabledSwitch}</EuiFlexItem>
      </EuiFlexGroup>
      {settingsBody}
    </EuiPanel>
  );
});
