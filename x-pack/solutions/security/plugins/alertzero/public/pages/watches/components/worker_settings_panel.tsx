/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { Worker } from '@kbn/alertzero-common';
import type { WorkerSettingsWrite } from '@kbn/alertzero-common';
import { AutonomyLevelControl } from './autonomy_level_control';
import { ScheduleIntervalField } from './schedule_interval_field';
import { WorkerSkillsTable } from './worker_skills_table';
import { getWatchCustomSettingsComponent } from '../custom_settings/registry';
import * as settingsI18n from '../settings_translations';
import { workerName } from '../workers/translations';
import type { WorkerSettingsDraft } from '../../../hooks/use_worker_settings_drafts';

interface WorkerSettingsPanelProps {
  worker: Worker;
  /** Accordion when a Watch has several Workers; a static panel when it has exactly one. */
  isAccordion: boolean;
  isExpanded: boolean;
  onToggle: (workerId: string, isOpen: boolean) => void;
  /** Draft state (worker-settings-page-decisions-3, item 1): controls edit the draft;
   *  nothing is written until Save. Undefined disables editing (no draft owner). */
  draft: WorkerSettingsDraft | undefined;
  isDirty: boolean;
  isSaving: boolean;
  onDraftSettingsChange: (patch: WorkerSettingsWrite) => void;
  onDraftEnabledChange: (enabled: boolean) => void;
  onSave: () => void;
  onDiscard: () => void;
}

/**
 * A single Worker's settings in the two-column layout. The header (name, autonomy/schedule badges,
 * enabled switch) doubles as the accordion button when a Watch has several Workers, so collapsed
 * panels still summarise their state. Memoized: scroll-spy updates in the parent must not
 * re-render every Worker's settings.
 *
 * Draft semantics: control onChange handlers only update the parent-held draft. Save and Discard
 * are the only paths that touch the API. Disabled Workers' settings still render (read-only) with
 * the toggle drafting the next enabled state.
 */
export const WorkerSettingsPanel = React.memo(function WorkerSettingsPanel({
  worker,
  isAccordion,
  isExpanded,
  onToggle,
  draft,
  isDirty,
  isSaving,
  onDraftSettingsChange,
  onDraftEnabledChange,
  onSave,
  onDiscard,
}: WorkerSettingsPanelProps) {
  const { euiTheme } = useEuiTheme();
  const settingsLocked = worker.state === 'unavailable';
  const name = workerName(worker.id, worker.name);
  const editable = draft !== undefined && !settingsLocked;
  const draftEnabled = draft?.enabled ?? worker.enabled;

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
      checked={draftEnabled}
      disabled={!editable}
      onChange={(event) => onDraftEnabledChange(event.target.checked)}
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
      <EuiSpacer size="m" />
      <AutonomyLevelControl
        workerId={worker.id}
        current={draft?.settings.autonomy ?? worker.settings.autonomy}
        allowedAutonomyLevels={worker.allowedAutonomyLevels}
        isDisabled={!editable}
        onChange={(autonomyLevel) => onDraftSettingsChange({ autonomy: autonomyLevel })}
      />
      {/* Only schedule-driven Workers project an interval; the others are alert- or
          event-triggered and own no schedule to configure. */}
      {(draft?.settings.scheduleInterval ?? worker.settings.scheduleInterval) != null ? (
        <>
          <EuiSpacer size="m" />
          <ScheduleIntervalField
            workerId={worker.id}
            current={(draft?.settings.scheduleInterval ?? worker.settings.scheduleInterval)!}
            isDisabled={!editable}
            onChange={(scheduleInterval) => onDraftSettingsChange({ scheduleInterval })}
          />
        </>
      ) : null}
      {/* Watch-owned custom settings (e.g. analysisWindowDays under extras) registered per
          Watch. The draft supplies the edited values; extras replaces whole-object on save. */}
      {(() => {
        const CustomSettings = worker.watchIds
          .map((watchId) => getWatchCustomSettingsComponent(watchId))
          .find((component) => component != null);
        return CustomSettings ? (
          <>
            <EuiSpacer size="m" />
            <CustomSettings
              worker={worker}
              settings={
                draft?.settings.extras != null
                  ? { ...worker.settings, extras: draft.settings.extras }
                  : worker.settings
              }
              isDisabled={!editable}
              onSettingsChange={(patch) => onDraftSettingsChange(patch)}
            />
          </>
        ) : null;
      })()}
      <EuiSpacer size="m" />
      <WorkerSkillsTable skills={worker.skills} />
    </>
  );

  const collapsedBadges = !isExpanded ? (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {settingsI18n.autonomyLevelName(draft?.settings.autonomy ?? worker.settings.autonomy)}
        </EuiBadge>
      </EuiFlexItem>
      {(draft?.settings.scheduleInterval ?? worker.settings.scheduleInterval) != null ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {settingsI18n.SCHEDULE_INTERVAL_LABEL}{' '}
            {draft?.settings.scheduleInterval ?? worker.settings.scheduleInterval}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  ) : null;

  const saveBar = editable ? (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            iconType="check"
            isLoading={isSaving}
            isDisabled={!isDirty || isSaving}
            onClick={onSave}
            data-test-subj={`alertZeroWorkerSettingsSave-${worker.id}`}
          >
            {settingsI18n.SAVE_WATCH_SETTINGS}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            isDisabled={!isDirty || isSaving}
            onClick={onDiscard}
            data-test-subj={`alertZeroWorkerSettingsDiscard-${worker.id}`}
          >
            {settingsI18n.DISCARD_WATCH_SETTINGS}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
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
          {saveBar}
        </EuiAccordion>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="l">
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span id={`${worker.id}-heading`}>{name}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{enabledSwitch}</EuiFlexItem>
      </EuiFlexGroup>
      {settingsBody}
      {saveBar}
    </EuiPanel>
  );
});
