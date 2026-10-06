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
import type { CoreStart } from '@kbn/core/public';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ServiceAccountField } from './service_account_field';
import type { AlertZeroStartDependencies } from '../../../types';
import { AutonomyLevelControl } from './autonomy_level_control';
import { getAutonomyLevelCards } from './autonomy_level_cards_data';
import { ScheduleIntervalField } from './schedule_interval_field';
import { SettingRow } from './setting_row';
import { ViewExecutionsLink } from './view_executions_link';
import { getWorkerCustomSettingsComponent } from '../custom_settings/registry';
import * as settingsI18n from '../settings_translations';
import { workerDescription, workerName } from '../workers/translations';
import { workerScheduleCadenceLabel } from './worker_trigger_cadence';
import type { WorkerWarningReason } from './worker_warning_content';
import { WorkerWarningIcon } from './worker_warning_icon';

interface WorkerSettingsPanelProps {
  worker: Worker;
  /** Accordion when a Watch has several Workers; a static panel when it has exactly one. */
  isAccordion: boolean;
  isExpanded: boolean;
  onToggle: (workerId: string, isOpen: boolean) => void;
  enabled: boolean;
  settings: WorkerSettings;
  error?: string;
  warningReasons: WorkerWarningReason[];
  /** Settings could not be read for this Worker; controls are locked and the subtitle says why. */
  settingsLocked: boolean;
  /** A Watch save is in flight; controls are locked so edits cannot slip into a draft about to be cleared. */
  isSaving: boolean;
  /** False for read-only AlertZero roles; settings stay visible but cannot be changed. */
  canWrite: boolean;
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
  warningReasons,
  settingsLocked,
  isSaving,
  canWrite,
  onEnabledChange,
  onSettingsChange,
  onTriggerValidityChange,
  draftResetKey,
}: WorkerSettingsPanelProps) {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana<CoreStart & AlertZeroStartDependencies>();
  const name = workerName(worker.id, worker.name);
  const description = workerDescription(worker.id);
  const autonomyLabel = settingsI18n.autonomyLevelName(settings.autonomy);
  const scheduleLabel =
    settings.scheduleInterval != null
      ? workerScheduleCadenceLabel(settings.scheduleInterval)
      : undefined;
  const controlsDisabled = settingsLocked || isSaving || !canWrite;
  // A worker that is already on can be turned off. Turning one on requires an account.
  const cannotEnable = !enabled && !settings.serviceAccountId;
  const executionsHref = worker.workflowId
    ? application.getUrlForApp(WORKFLOWS_APP_ID, {
        path: `/${encodeURIComponent(worker.workflowId)}?tab=executions`,
      })
    : undefined;
  const CustomSettings = getWorkerCustomSettingsComponent(worker.id);
  const autonomyIntro = getAutonomyLevelCards(worker.id)?.intro;

  const accordionHeaderStyles = useMemo(
    () => css`
      align-self: flex-start;
      width: 100%;
      min-width: 0;
      padding-block: ${euiTheme.size.base};
      padding-inline-end: ${euiTheme.size.base};
      padding-inline-start: 0;
      text-align: left;
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
      /*
       * EuiAccordion's trigger is itself a flex item with min-width: auto, whose automatic minimum
       * size is the band's min-content width. With white-space: nowrap on the title the whole name
       * is atomic, so that floor is the full name: without this relief the button cannot shrink
       * below it, neither the badge wrap nor the title ellipsis fires, and a long name pushes the
       * header past its panel.
       */
      min-width: 0;

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

  const stopAccordionToggle = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
  };

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
          wrap
          css={css`
            width: 100%;
            min-width: 0;
          `}
        >
          <EuiFlexItem grow={false} css={{ maxWidth: '100%' }}>
            <EuiTitle size="s">
              {/*
                The accordion band gives the trailing actions (View executions + Enabled switch)
                width precedence, which used to squeeze the title until EUI's `overflow-wrap` stacked
                the name one character per line. `nowrap` keeps it on one line, the group's `wrap`
                moves the badges to their own line first, and the 100% clamp ellipsizes a name that
                alone exceeds the band (`title` keeps the full name recoverable).
              */}
              <TitleTag
                id={titleId}
                title={name}
                css={{
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {name}
              </TitleTag>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{autonomyLabel}</EuiBadge>
          </EuiFlexItem>
          {scheduleLabel ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj={`alertZeroWorkerScheduleBadge-${worker.id}`}>
                {scheduleLabel}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          {warningReasons.length > 0 ? (
            // The band is the accordion's click target; clicking the icon must not collapse it.
            <EuiFlexItem grow={false} onClick={stopAccordionToggle}>
              <WorkerWarningIcon workerId={worker.id} workerName={name} reasons={warningReasons} />
            </EuiFlexItem>
          ) : null}
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
          <EuiFlexItem />
          <EuiFlexItem grow={false} onClick={stopAccordionToggle} onKeyDown={stopAccordionToggle}>
            {headerActions}
          </EuiFlexItem>
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
      compressed
      label={settingsI18n.ENABLED_SWITCH_LABEL}
      checked={enabled}
      disabled={controlsDisabled || cannotEnable}
      onChange={(event) => onEnabledChange(event.target.checked)}
      data-test-subj={`alertZeroWorkerEnabledSwitch-${worker.id}`}
    />
  );

  const headerActions = (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap={false}>
      {executionsHref ? (
        <EuiFlexItem grow={false}>
          <ViewExecutionsLink
            workerId={worker.id}
            workerName={name}
            executionsHref={executionsHref}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>{enabledSwitch}</EuiFlexItem>
    </EuiFlexGroup>
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
            <p>{error}</p>
          </EuiText>
        </>
      ) : null}
      <SettingRow
        label={settingsI18n.SERVICE_ACCOUNT_LABEL}
        labelHelp={settingsI18n.SERVICE_ACCOUNT_HELP}
        data-test-subj={`alertZeroServiceAccountRow-${worker.id}`}
      >
        <ServiceAccountField
          workerId={worker.id}
          workerName={name}
          current={settings.serviceAccountId}
          isDisabled={controlsDisabled}
          onChange={(serviceAccountId) => onSettingsChange({ serviceAccountId })}
        />
        {enabled && !settings.serviceAccountId ? (
          <>
            <EuiSpacer size="s" />
            <EuiText
              size="xs"
              color="danger"
              data-test-subj={`alertZeroServiceAccountRequired-${worker.id}`}
            >
              <p>{settingsI18n.SERVICE_ACCOUNT_REQUIRED_TO_SAVE}</p>
            </EuiText>
          </>
        ) : null}
      </SettingRow>
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
    </>
  );

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
          width: 100%;
          padding: ${euiTheme.size.base};
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        {headerBandContent(`${worker.id}-heading`, 'h2')}
      </div>
      <div css={{ padding: euiTheme.size.base }}>{settingsBody}</div>
    </EuiPanel>
  );
});
