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
import { getAutonomyLevelCards } from './autonomy_level_cards_data';
import { ScheduleIntervalField } from './schedule_interval_field';
import { SettingRow } from './setting_row';
import { WorkerSkillsTable } from './worker_skills_table';
import { getWorkerCustomSettingsComponent } from '../custom_settings/registry';
import * as settingsI18n from '../settings_translations';
import { workerDescription, workerName } from '../workers/translations';
import { workerScheduleCadenceLabel } from './worker_trigger_cadence';

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
  /** Raised when this Worker's trigger control holds an amount that cannot be committed. */
  onTriggerValidityChange?: (isValid: boolean) => void;
  /** Bumped by the page on Discard so controls holding a flagged draft clear it. */
  draftResetKey?: number;
}

/**
 * A single Worker's settings. The header doubles as the accordion button when a Watch has several
 * Workers, so collapsed panels still summarise their state. Every control writes into the page
 * draft; Save and Discard live on the page header.
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
  onTriggerValidityChange,
  draftResetKey,
}: WorkerSettingsPanelProps) {
  const { euiTheme } = useEuiTheme();
  const name = workerName(worker.id, worker.name);
  const description = workerDescription(worker.id);
  const autonomyLabel = settingsI18n.autonomyLevelName(settings.autonomy);
  const triggerLabel =
    settings.scheduleInterval != null
      ? workerScheduleCadenceLabel(settings.scheduleInterval)
      : settingsI18n.MANUAL_RUN_LABEL;
  const controlsDisabled = settingsLocked || isSaving;
  const CustomSettings = getWorkerCustomSettingsComponent(worker.id);
  const autonomyIntro = getAutonomyLevelCards(worker.id)?.intro;

  const accordionHeaderStyles = useMemo(
    () => css`
      align-self: flex-start;
      width: 100%;
      min-width: 0;
      padding: ${euiTheme.size.base};
      text-align: left;
    `,
    [euiTheme]
  );

  const accordionHeaderActionStyles = useMemo(
    () => css`
      align-self: flex-start;
      padding: ${euiTheme.size.base};
    `,
    [euiTheme]
  );

  const accordionArrowStyles = useMemo(
    () => css`
      align-self: flex-start;
      margin-left: ${euiTheme.size.base};
      margin-top: ${euiTheme.size.base};
    `,
    [euiTheme]
  );

  const accordionButtonStyles = useMemo(
    () => css`
      width: auto;

      &,
      &:hover,
      &:focus,
      &:hover *,
      &:focus * {
        text-decoration: none;
      }
    `,
    []
  );

  const accordionBodyStyles = useMemo(
    () => css`
      padding: ${euiTheme.size.base};
      /* Full-width rule under the header, mirroring the static single-Worker band. */
      border-top: ${isExpanded ? euiTheme.border.thin : 'none'};
    `,
    [euiTheme, isExpanded]
  );

  const bandContentStyles = useMemo(
    () => ({
      description: css`
        margin-top: calc(${euiTheme.size.xs} + 4px);
        width: 100%;
      `,
    }),
    [euiTheme]
  );

  const headerBandContent = (titleId: string, titleAs: 'span' | 'h2') => {
    const TitleTag = titleAs;
    return (
      <div
        css={css`
          width: 100%;
          min-width: 0;
          text-align: left;
        `}
      >
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          wrap={false}
          css={css`
            min-width: 0;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <TitleTag id={titleId} css={{ margin: 0 }}>
                {name}
              </TitleTag>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{autonomyLabel}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{triggerLabel}</EuiBadge>
          </EuiFlexItem>
          {/* Carried on the band itself so a collapsed Worker still reports a failed save. */}
          {error ? (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="danger"
                data-test-subj={`alertZeroWorkerHeaderSaveError-${worker.id}`}
              >
                {settingsI18n.WORKER_SETTINGS_SAVE_ERROR}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        {description ? (
          <EuiText size="s" color="subdued" css={bandContentStyles.description}>
            <p css={{ margin: 0 }}>{description}</p>
          </EuiText>
        ) : null}
      </div>
    );
  };

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
      <SettingRow
        label={settingsI18n.AUTONOMY_SECTION_TITLE}
        labelHelp={autonomyIntro}
        data-test-subj={`alertZeroAutonomyRow-${worker.id}`}
      >
        <AutonomyLevelControl
          workerId={worker.id}
          current={settings.autonomy}
          allowedAutonomyLevels={getAllowedAutonomyLevels(worker.id)}
          isDisabled={controlsDisabled}
          onChange={(autonomy) => onSettingsChange({ autonomy })}
        />
      </SettingRow>
      {/* Only schedule-driven Workers project an interval; its presence is the signal. */}
      {settings.scheduleInterval != null ? (
        <SettingRow
          label={settingsI18n.TRIGGER_LABEL}
          labelHelp={settingsI18n.TRIGGER_HELP_TEXT}
          data-test-subj={`alertZeroTriggerRow-${worker.id}`}
        >
          <ScheduleIntervalField
            workerId={worker.id}
            current={settings.scheduleInterval}
            isDisabled={controlsDisabled}
            onChange={(scheduleInterval) => onSettingsChange({ scheduleInterval })}
            onValidityChange={onTriggerValidityChange}
            resetKey={draftResetKey}
          />
        </SettingRow>
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

  const stopAccordionToggle = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
  };

  if (isAccordion) {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="none">
        <EuiAccordion
          id={`${worker.id}-settings`}
          arrowDisplay="left"
          paddingSize="none"
          forceState={isExpanded ? 'open' : 'closed'}
          onToggle={(isOpen) => onToggle(worker.id, isOpen)}
          // `div` so the Worker name can be a real `h2` (a heading inside a `<button>` is
          // invalid HTML). EUI keeps the arrow as the interactive control in this mode.
          buttonElement="div"
          buttonContentClassName="alertZeroWorkerAccordion__buttonContent"
          buttonContent={
            <div
              css={accordionHeaderStyles}
              data-test-subj={`alertZeroWorkerAccordionHeader-${worker.id}`}
            >
              {headerBandContent(`${worker.id}-heading`, 'h2')}
            </div>
          }
          // Layout rides on EuiAccordion's props and our own nodes, not EUI's internal class
          // names, which are not public contract.
          buttonProps={{ css: accordionButtonStyles }}
          arrowProps={{ css: accordionArrowStyles }}
          extraAction={
            <div
              css={accordionHeaderActionStyles}
              onClick={stopAccordionToggle}
              onKeyDown={stopAccordionToggle}
            >
              {enabledSwitch}
            </div>
          }
          data-test-subj={`alertZeroWatchWorkerAccordion-${worker.id}`}
          css={css`
            .alertZeroWorkerAccordion__buttonContent {
              flex: 1;
              min-width: 0;
              width: 100%;
            }
          `}
        >
          <div
            css={accordionBodyStyles}
            data-test-subj={`alertZeroWorkerSettingsBody-${worker.id}`}
          >
            {settingsBody}
          </div>
        </EuiAccordion>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      <div
        css={css`
          display: flex;
          align-items: flex-start;
          gap: ${euiTheme.size.m};
          width: 100%;
          padding: ${euiTheme.size.base};
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <div css={{ flex: 1, minWidth: 0 }}>{headerBandContent(`${worker.id}-heading`, 'h2')}</div>
        {enabledSwitch}
      </div>
      <div css={{ padding: euiTheme.size.base }}>{settingsBody}</div>
    </EuiPanel>
  );
});
