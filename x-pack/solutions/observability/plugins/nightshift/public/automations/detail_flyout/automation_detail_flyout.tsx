/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenu,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiHorizontalRule,
  EuiPanel,
  EuiProgress,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useHistory, useLocation } from 'react-router-dom';
import { buildNightshiftInvestigationFlyoutShareUrl } from '../../common/url_params';
import { AutomationFormBody } from '../flyouts/form/automation_form_body';
import {
  toAutomationFormValues,
  type AutomationFormValues,
} from '../flyouts/form/automation_form_values';
import { canSaveAutomation, getSaveBlocker, isTriggerValid } from '../flyouts/form/validation';
import { toAutomationUpdateBody } from '../flyouts/form/to_automation_request';
import { SectionHeader, FormSection } from '../flyouts/form/section_header';
import {
  useAutomationRunsInRange,
  useCreateAutomation,
  useToggleAutomation,
  useUpdateAutomation,
  type Automation,
} from '../hooks/use_automations';
import { toCloneRequestBody } from '../utils/clone_automation';
import { RunsSparkline } from '../list/cells/runs_sparkline';
import { RunHistory, RunStatusIndicator, STATUSES, type Run } from './run_history';

const labels = {
  title: i18n.translate('xpack.nightshift.automations.detail.title', {
    defaultMessage: 'Automation',
  }),
  overview: i18n.translate('xpack.nightshift.automations.detail.overview', {
    defaultMessage: 'Overview',
  }),
  runHistory: i18n.translate('xpack.nightshift.automations.detail.runHistory', {
    defaultMessage: 'Run history',
  }),
  enabled: i18n.translate('xpack.nightshift.automations.enabledStatus', {
    defaultMessage: 'Enabled',
  }),
  disabled: i18n.translate('xpack.nightshift.automations.disabledStatus', {
    defaultMessage: 'Disabled',
  }),
  noDescription: i18n.translate('xpack.nightshift.automations.detail.noDescription', {
    defaultMessage: 'No description.',
  }),
  previous: i18n.translate('xpack.nightshift.automations.detail.previous', {
    defaultMessage: 'Previous automation (↑)',
  }),
  next: i18n.translate('xpack.nightshift.automations.detail.next', {
    defaultMessage: 'Next automation (↓)',
  }),
  close: i18n.translate('xpack.nightshift.automations.detail.close', {
    defaultMessage: 'Close flyout',
  }),
  edit: i18n.translate('xpack.nightshift.automations.detail.edit', { defaultMessage: 'Edit' }),
  clone: i18n.translate('xpack.nightshift.automations.cloneAction', { defaultMessage: 'Clone' }),
  delete: i18n.translate('xpack.nightshift.automations.deleteAction', { defaultMessage: 'Delete' }),
  save: i18n.translate('xpack.nightshift.automations.flyout.save', { defaultMessage: 'Save' }),
  cancel: i18n.translate('xpack.nightshift.automations.cancelButton', { defaultMessage: 'Cancel' }),
  actions: i18n.translate('xpack.nightshift.automations.detail.actions', {
    defaultMessage: 'Actions',
  }),
  discardTitle: i18n.translate('xpack.nightshift.automations.detail.discardTitle', {
    defaultMessage: 'Discard unsaved changes?',
  }),
  keepEditing: i18n.translate('xpack.nightshift.automations.flyout.keepEditing', {
    defaultMessage: 'Keep editing',
  }),
  discard: i18n.translate('xpack.nightshift.automations.flyout.discard', {
    defaultMessage: 'Discard',
  }),
  saveError: i18n.translate('xpack.nightshift.automations.detail.saveError', {
    defaultMessage: 'Fix the form issues before saving.',
  }),
  investigation: i18n.translate('xpack.nightshift.automations.detail.openInvestigation', {
    defaultMessage: 'Open investigation',
  }),
  editAutomation: i18n.translate('xpack.nightshift.automations.detail.editAutomation', {
    defaultMessage: 'Edit automation',
  }),
  automationRun: i18n.translate('xpack.nightshift.automations.detail.automationRun', {
    defaultMessage: 'Automation run',
  }),
  run: i18n.translate('xpack.nightshift.automations.detail.run', { defaultMessage: 'Run' }),
  description: i18n.translate('xpack.nightshift.automations.detail.description', {
    defaultMessage: 'Description',
  }),
  automationTags: i18n.translate('xpack.nightshift.automations.detail.automationTags', {
    defaultMessage: 'Automation tags',
  }),
  author: i18n.translate('xpack.nightshift.automations.detail.author', {
    defaultMessage: 'Author',
  }),
  todayUsage: i18n.translate('xpack.nightshift.automations.detail.todayUsage', {
    defaultMessage: "Today's usage",
  }),
  triggered: i18n.translate('xpack.nightshift.automations.detail.triggered', {
    defaultMessage: 'Triggered',
  }),
  source: i18n.translate('xpack.nightshift.automations.detail.source', {
    defaultMessage: 'Source',
  }),
  message: i18n.translate('xpack.nightshift.automations.detail.message', {
    defaultMessage: 'Message',
  }),
  reason: i18n.translate('xpack.nightshift.automations.detail.reason', {
    defaultMessage: 'Reason',
  }),
  started: i18n.translate('xpack.nightshift.automations.detail.started', {
    defaultMessage: 'Started',
  }),
  ended: i18n.translate('xpack.nightshift.automations.detail.ended', { defaultMessage: 'Ended' }),
  automation: i18n.translate('xpack.nightshift.automations.detail.automation', {
    defaultMessage: 'Automation',
  }),
  runsTitle: i18n.translate('xpack.nightshift.automations.detail.runsTitle', {
    defaultMessage: 'Runs',
  }),
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const formatStarted = (value: string) => `${formatDate(value)} (${moment(value).fromNow()})`;

export const AutomationDetailFlyout = ({
  automations,
  automation,
  canManage,
  usedToday,
  onClose,
  onDelete,
}: {
  automations: Automation[];
  automation: Automation;
  canManage: boolean;
  usedToday: number;
  onClose: () => void;
  onDelete: (automation: Automation) => void;
}) => {
  const titleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { pathname, search } = useLocation();
  const statusParam = new URLSearchParams(search).get('status');
  const initialRunFilter = STATUSES.find((status) => status === statusParam);
  const [isEditing, setIsEditing] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run>();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const originalValues = useMemo(() => toAutomationFormValues(automation), [automation]);
  const [values, setValues] = useState<AutomationFormValues>(originalValues);
  const updateAutomation = useUpdateAutomation();
  const createAutomation = useCreateAutomation();
  const toggleAutomation = useToggleAutomation();
  const isRunsTab = pathname.endsWith('/runs');
  const isDirty = JSON.stringify(values) !== JSON.stringify(originalValues);
  const blocker = getSaveBlocker(values);
  const valid = canSaveAutomation(values) && Boolean(values.name.trim());
  const runRange = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 48 * 60 * 60 * 1000);
    return { startedAfter: start.toISOString(), startedBefore: end.toISOString() };
  }, []);
  const runsQuery = useAutomationRunsInRange(
    automation.id,
    runRange.startedAfter,
    runRange.startedBefore
  );
  const runs = (runsQuery.data?.runs ?? []) as Run[];
  const skippedRuns = runs.filter(({ status }) => status === 'skipped').length;
  const startedRuns = (runsQuery.data?.total ?? 0) - skippedRuns;
  const dailyLimit = automation.runtime.dailyDispatchLimit;
  const isLimitReached = dailyLimit !== undefined && usedToday >= dailyLimit;
  const limitColor = euiTheme.colors.vis.euiColorVisWarning0;
  const orderedAutomations = automations;
  const currentIndex = orderedAutomations.findIndex(({ id: rowId }) => rowId === automation.id);
  const previous = orderedAutomations[currentIndex - 1];
  const next = orderedAutomations[currentIndex + 1];

  const navigate = (path: string) => history.push(path);
  const requestClose = () => {
    if (isEditing && isDirty) {
      setIsDiscardOpen(true);
      return;
    }
    onClose();
  };
  const selectAutomation = (selected: Automation) =>
    navigate(`/automations/${selected.id}${isRunsTab ? '/runs' : ''}`);
  useEffect(() => {
    if (isEditing || selectedRun) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        target.isContentEditable ||
        target.closest(
          'input, textarea, select, [role="dialog"]:not([data-test-subj="automationDetailFlyout"]), [role="menu"]'
        )
      ) {
        return;
      }
      if (event.key === 'ArrowUp' && previous) {
        event.preventDefault();
        history.push(`/automations/${previous.id}${isRunsTab ? '/runs' : ''}`);
      }
      if (event.key === 'ArrowDown' && next) {
        event.preventDefault();
        history.push(`/automations/${next.id}${isRunsTab ? '/runs' : ''}`);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [history, isEditing, next, previous, selectedRun, isRunsTab]);
  const startEditing = () => {
    setValues(originalValues);
    setIsEditing(true);
    setIsActionsOpen(false);
  };
  const headerCss = css`
    padding: ${euiTheme.size.base} ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.base};
  `;
  const bodyCss = css`
    padding: ${euiTheme.size.base};
  `;
  const save = () => {
    if (!values.trigger || !isTriggerValid(values.trigger)) return;
    updateAutomation.mutate(
      {
        id: automation.id,
        body: toAutomationUpdateBody({ ...values, trigger: values.trigger }, automation),
      },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  return (
    <EuiFlyout
      type="overlay"
      side="right"
      size={780}
      minWidth={420}
      maxWidth={960}
      paddingSize="none"
      hideCloseButton
      ownFocus={isEditing}
      aria-labelledby={titleId}
      onClose={requestClose}
      data-test-subj="automationDetailFlyout"
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          height: 100%;
        `}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 ${isEditing ? euiTheme.size.base : euiTheme.size.s};
            min-height: ${euiTheme.size.xxxl};
            border-bottom: ${euiTheme.border.thin};
          `}
        >
          {isRunsTab && selectedRun ? (
            <EuiToolTip content={labels.runHistory} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="sortLeft"
                size="xs"
                color="text"
                aria-label={labels.runHistory}
                data-test-subj="automationRunDetailBack"
                onClick={() => {
                  setSelectedRun(undefined);
                  navigate(`/automations/${automation.id}/runs`);
                }}
              />
            </EuiToolTip>
          ) : isEditing ? (
            <EuiTitle size="xs">
              <h2 id={titleId}>{labels.editAutomation}</h2>
            </EuiTitle>
          ) : (
            <>
              <EuiToolTip content={labels.previous} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="chevronSingleUp"
                  size="xs"
                  color="text"
                  aria-label={labels.previous}
                  data-test-subj="automationPreviousButton"
                  isDisabled={!previous}
                  onClick={() => previous && selectAutomation(previous)}
                />
              </EuiToolTip>
              <EuiToolTip content={labels.next} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="chevronSingleDown"
                  size="xs"
                  color="text"
                  aria-label={labels.next}
                  data-test-subj="automationNextButton"
                  isDisabled={!next}
                  onClick={() => next && selectAutomation(next)}
                />
              </EuiToolTip>
            </>
          )}
          <EuiFlexItem />
          <EuiToolTip content={labels.close} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="automationCloseButton"
              iconType="cross"
              size="xs"
              color="text"
              aria-label={labels.close}
              onClick={requestClose}
            />
          </EuiToolTip>
        </div>
        {isRunsTab && selectedRun ? (
          <>
            <header css={headerCss}>
              <EuiTitle size="s">
                <h2 id={titleId}>{selectedRun.title || labels.automationRun}</h2>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <RunStatusIndicator status={selectedRun.status} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    · {formatStarted(selectedRun.startedAt)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </header>
            <EuiFlyoutBody>
              <div css={bodyCss}>
                {selectedRun.status === 'skipped' ? (
                  <EuiDescriptionList
                    type="column"
                    listItems={[
                      {
                        title: labels.triggered,
                        description: formatStarted(selectedRun.startedAt),
                      },
                      { title: labels.source, description: selectedRun.triggeredBy ?? '—' },
                      { title: labels.message, description: selectedRun.message ?? '—' },
                      {
                        title: labels.reason,
                        description:
                          selectedRun.skipReason === 'daily_limit'
                            ? i18n.translate(
                                'xpack.nightshift.automations.detail.dailyLimitReason',
                                {
                                  defaultMessage:
                                    'Daily trigger limit of {limit} was already reached, so this trigger did not start a run.',
                                  values: { limit: selectedRun.dailyLimit ?? '—' },
                                }
                              )
                            : '—',
                      },
                      { title: labels.automation, description: automation.name },
                    ]}
                  />
                ) : (
                  <>
                    <SectionHeader title={labels.run} />
                    <EuiSpacer size="s" />
                    <EuiDescriptionList
                      type="column"
                      columnWidths={['auto', 1]}
                      listItems={[
                        { title: labels.source, description: selectedRun.triggeredBy ?? '—' },
                        { title: labels.message, description: selectedRun.message ?? '—' },
                        {
                          title: labels.started,
                          description: formatStarted(selectedRun.startedAt),
                        },
                        {
                          title: labels.ended,
                          description: selectedRun.finishedAt
                            ? formatDate(selectedRun.finishedAt)
                            : '—',
                        },
                        { title: labels.automation, description: automation.name },
                      ]}
                    />
                    {selectedRun.investigationId && (
                      <>
                        <EuiHorizontalRule margin="m" />
                        <EuiButton
                          size="s"
                          data-test-subj="automationRunOpenInvestigation"
                          href={buildNightshiftInvestigationFlyoutShareUrl(
                            selectedRun.investigationId
                          )}
                        >
                          {labels.investigation}
                        </EuiButton>
                      </>
                    )}
                  </>
                )}
              </div>
            </EuiFlyoutBody>
          </>
        ) : (
          <>
            {!isEditing && (
              <>
                <header css={headerCss}>
                  <EuiTitle size="s">
                    <h2 id={titleId}>{automation.name}</h2>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiBadgeGroup gutterSize="xs">
                    <EuiBadge color="hollow">{labels.title}</EuiBadge>
                    <EuiBadge color={automation.isEnabled ? 'success' : 'hollow'}>
                      {automation.isEnabled ? labels.enabled : labels.disabled}
                    </EuiBadge>
                  </EuiBadgeGroup>
                </header>
                <div css={{ padding: `${euiTheme.size.s} ${euiTheme.size.base}` }}>
                  <InfoStrip
                    items={[
                      {
                        title: labels.enabled,
                        value: (
                          <EuiSwitch
                            compressed
                            showLabel={false}
                            label={labels.enabled}
                            checked={automation.isEnabled}
                            disabled={!canManage}
                            onChange={(event) =>
                              toggleAutomation.mutate({
                                id: automation.id,
                                isEnabled: event.target.checked,
                              })
                            }
                          />
                        ),
                      },
                      {
                        title: labels.author,
                        value: automation.author ? (
                          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiAvatar size="s" name={automation.author} />
                            </EuiFlexItem>
                            <EuiFlexItem className="eui-textTruncate">
                              {automation.author}
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        ) : (
                          '—'
                        ),
                      },
                      {
                        title: labels.runsTitle,
                        gap: 'xs',
                        value: (
                          <div css={{ inlineSize: '100%' }}>
                            {startedRuns}
                            {startedRuns > 0 && (
                              <RunsSparkline
                                runs={runs}
                                startedAfter={runRange.startedAfter}
                                startedBefore={runRange.startedBefore}
                              />
                            )}
                          </div>
                        ),
                      },
                      {
                        title: labels.todayUsage,
                        gap: 'xs',
                        value: (
                          <div
                            css={{
                              inlineSize: '100%',
                              color: isLimitReached ? limitColor : undefined,
                            }}
                          >
                            {usedToday} / {automation.runtime.dailyDispatchLimit ?? '—'}
                            <EuiSpacer size="xs" />
                            <EuiProgress
                              size="s"
                              color={isLimitReached ? limitColor : 'success'}
                              value={usedToday}
                              max={automation.runtime.dailyDispatchLimit ?? 1}
                            />
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
                <div css={{ padding: `${euiTheme.size.s} ${euiTheme.size.base} 0` }}>
                  <EuiTabs>
                    {[labels.overview, labels.runHistory].map((label, index) => (
                      <EuiTab
                        key={label}
                        isSelected={Boolean(index) === isRunsTab}
                        onClick={() => {
                          setSelectedRun(undefined);
                          navigate(`/automations/${automation.id}${index ? '/runs' : ''}`);
                        }}
                      >
                        {label}
                      </EuiTab>
                    ))}
                  </EuiTabs>
                </div>
              </>
            )}
            <EuiFlyoutBody>
              <div css={bodyCss}>
                {isEditing ? (
                  <AutomationFormBody
                    usedToday={usedToday}
                    values={values}
                    tagSuggestions={automations.flatMap(({ tags }) => tags ?? [])}
                    isNameInvalid={!values.name.trim()}
                    onChange={(changes) => setValues((current) => ({ ...current, ...changes }))}
                  />
                ) : isRunsTab ? (
                  <RunHistory
                    key={initialRunFilter}
                    initialFilter={initialRunFilter}
                    runs={runs}
                    isLoading={runsQuery.isLoading}
                    startedAfter={runRange.startedAfter}
                    startedBefore={runRange.startedBefore}
                    automationName={automation.name}
                    onSelect={setSelectedRun}
                  />
                ) : (
                  <>
                    {automation.description?.trim() && (
                      <FormSection>
                        <SectionHeader title={labels.description} />
                        <EuiSpacer size="s" />
                        <EuiText size="s">{automation.description}</EuiText>
                      </FormSection>
                    )}
                    {Boolean(automation.tags?.length) && (
                      <FormSection>
                        <SectionHeader title={labels.automationTags} />
                        <EuiSpacer size="s" />
                        <EuiBadgeGroup gutterSize="xs">
                          {automation.tags?.map((tag) => (
                            <EuiBadge key={tag} color="hollow">
                              {tag}
                            </EuiBadge>
                          ))}
                        </EuiBadgeGroup>
                      </FormSection>
                    )}
                    <AutomationFormBody
                      usedToday={usedToday}
                      values={originalValues}
                      tagSuggestions={[]}
                      isNameInvalid={false}
                      readOnly
                      showIdentityFields={false}
                      onChange={() => {}}
                    />
                  </>
                )}
              </div>
            </EuiFlyoutBody>
            <EuiFlyoutFooter
              css={css`
                background: ${euiTheme.colors.backgroundBasePlain};
                border-top: ${euiTheme.border.thin};
              `}
            >
              <EuiFlexGroup
                justifyContent="flexEnd"
                gutterSize="s"
                responsive={false}
                css={{ padding: euiTheme.size.m }}
              >
                {isEditing ? (
                  <>
                    <EuiToolTip content={blocker}>
                      <EuiButton
                        data-test-subj="automationSaveButton"
                        size="s"
                        disabled={
                          !valid || !isDirty || updateAutomation.isLoading || Boolean(blocker)
                        }
                        onClick={save}
                      >
                        {labels.save}
                      </EuiButton>
                    </EuiToolTip>
                    <EuiButton
                      data-test-subj="automationCancelEditButton"
                      size="s"
                      color="text"
                      onClick={() => {
                        setValues(originalValues);
                        setIsEditing(false);
                      }}
                    >
                      {labels.cancel}
                    </EuiButton>
                  </>
                ) : (
                  canManage && (
                    <>
                      <EuiButton
                        data-test-subj="automationEditButton"
                        size="s"
                        iconType="pencil"
                        onClick={startEditing}
                      >
                        {labels.edit}
                      </EuiButton>
                      <EuiPopover
                        aria-label={labels.actions}
                        isOpen={isActionsOpen}
                        closePopover={() => setIsActionsOpen(false)}
                        panelPaddingSize="none"
                        anchorPosition="upRight"
                        button={
                          <EuiButton
                            data-test-subj="automationActionsButton"
                            size="s"
                            fill
                            iconType="chevronSingleDown"
                            iconSide="right"
                            onClick={() => setIsActionsOpen((open) => !open)}
                          >
                            {labels.actions}
                          </EuiButton>
                        }
                      >
                        <EuiContextMenu
                          initialPanelId={0}
                          panels={[
                            {
                              id: 0,
                              width: 240,
                              items: [
                                {
                                  name: labels.clone,
                                  icon: 'copy',
                                  'data-test-subj': 'automationCloneButton',
                                  onClick: () => {
                                    createAutomation.mutate(toCloneRequestBody(automation));
                                    setIsActionsOpen(false);
                                  },
                                },
                                { isSeparator: true, key: 'divider' },
                                {
                                  name: labels.delete,
                                  icon: 'trash',
                                  color: 'danger',
                                  'data-test-subj': 'automationDeleteButton',
                                  onClick: () => {
                                    onDelete(automation);
                                    setIsActionsOpen(false);
                                  },
                                },
                              ],
                            },
                          ]}
                        />
                      </EuiPopover>
                    </>
                  )
                )}
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </>
        )}
      </div>
      {isDiscardOpen && (
        <EuiConfirmModal
          title={labels.discardTitle}
          aria-label={labels.discardTitle}
          onCancel={() => setIsDiscardOpen(false)}
          onConfirm={() => {
            setIsDiscardOpen(false);
            setIsEditing(false);
            setValues(originalValues);
            onClose();
          }}
          cancelButtonText={labels.keepEditing}
          confirmButtonText={labels.discard}
        >
          {i18n.translate('xpack.nightshift.automations.detail.discardBody', {
            defaultMessage:
              'You have unsaved changes to {name}. If you leave now, your edits will be lost.',
            values: { name: automation.name },
          })}
        </EuiConfirmModal>
      )}
    </EuiFlyout>
  );
};

const InfoStrip = ({
  items,
}: {
  items: Array<{ title: string; value: React.ReactNode; gap?: 'xs' | 's' }>;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={css`
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        & > * {
          position: relative;
          min-inline-size: 0;
          padding: ${euiTheme.size.m};
        }
        & > :not(:last-child)::before {
          content: '';
          position: absolute;
          inset-inline-end: 0;
          inset-block: ${euiTheme.size.base};
          inline-size: ${euiTheme.border.width.thin};
          background-color: ${euiTheme.border.color};
        }
      `}
    >
      {items.map(({ title, value, gap = 's' }) => (
        <div key={title}>
          <EuiText size="xs" color="subdued">
            {title}
          </EuiText>
          <EuiText
            size="s"
            css={{ display: 'flex', alignItems: 'center', paddingBlockStart: euiTheme.size[gap] }}
          >
            {value}
          </EuiText>
        </div>
      ))}
    </EuiPanel>
  );
};
