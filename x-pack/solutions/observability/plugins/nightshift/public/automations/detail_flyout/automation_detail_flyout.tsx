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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
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
import { useHistory, useLocation } from 'react-router-dom';
import { NIGHTSHIFT_APP_ROUTE } from '../../../common/constants';
import { useKibana } from '../../hooks/use_kibana';
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
  useToggleAutomation,
  useUpdateAutomation,
  type Automation,
} from '../hooks/use_automations';
import { getDailyUsageTone } from '../utils/daily_usage';
import { statusLabels } from '../utils/filter_automations';
import type { RunRange } from '../hooks/use_automation_usage';
import { RunsSparkline } from '../list/cells/runs_sparkline';
import { InfoStrip } from './info_strip';
import { RunHistory, STATUSES, type Run } from './run_history';
import { RunDetail } from './run_detail';

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
  back: i18n.translate('xpack.nightshift.automations.detail.back', { defaultMessage: 'Back' }),
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
  editAutomation: i18n.translate('xpack.nightshift.automations.detail.editAutomation', {
    defaultMessage: 'Edit automation',
  }),
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
  runsTitle: i18n.translate('xpack.nightshift.automations.detail.runsTitle', {
    defaultMessage: 'Runs',
  }),
};

export const AutomationDetailFlyout = ({
  automations,
  automation,
  canManage,
  usedToday,
  runRange,
  rangeLabel,
  onClose,
  onClone,
  onDelete,
}: {
  automations: Automation[];
  automation: Automation;
  canManage: boolean;
  usedToday: number;
  runRange: RunRange;
  rangeLabel: string;
  onClose: () => void;
  onClone: (automation: Automation) => void;
  onDelete: (automation: Automation) => void;
}) => {
  const titleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const {
    application,
    http: { basePath },
  } = useKibana().services;
  const { pathname, search } = useLocation();
  const statusParam = new URLSearchParams(search).get('status');
  const initialRunFilter = STATUSES.find((status) => status === statusParam);
  const [isEditing, setIsEditing] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [blockedPath, setBlockedPath] = useState<string>();
  const [exit, setExit] = useState<{ path?: string }>();
  const [isNameInvalid, setIsNameInvalid] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run>();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const originalValues = useMemo(() => toAutomationFormValues(automation), [automation]);
  const [values, setValues] = useState<AutomationFormValues>(originalValues);
  const updateAutomation = useUpdateAutomation();
  const toggleAutomation = useToggleAutomation();
  const isRunsTab = pathname.endsWith('/runs');
  const isDirty = JSON.stringify(values) !== JSON.stringify(originalValues);
  const blocker = getSaveBlocker(values);
  const valid = canSaveAutomation(values);
  const runsQuery = useAutomationRunsInRange(
    automation.id,
    runRange.startedAfter,
    runRange.startedBefore
  );
  const runs = (runsQuery.data?.runs ?? []) as Run[];
  const skippedRuns = runs.filter(({ status }) => status === 'skipped').length;
  const startedRuns = (runsQuery.data?.total ?? 0) - skippedRuns;
  const dailyLimit = automation.runtime.dailyDispatchLimit;
  const isLimitHigh =
    dailyLimit !== undefined && getDailyUsageTone(usedToday, dailyLimit) !== 'healthy';
  const limitColor = euiTheme.colors.vis.euiColorVisWarning0;
  const currentIndex = automations.findIndex(({ id: rowId }) => rowId === automation.id);
  const isInList = currentIndex !== -1;
  const previous = isInList ? automations[currentIndex - 1] : undefined;
  const next = isInList ? automations[currentIndex + 1] : undefined;
  const runCount = (status: Run['status']) => runs.filter((run) => run.status === status).length;
  const runsTooltip = i18n.translate('xpack.nightshift.automations.detail.runsTooltip', {
    defaultMessage: '{counts} in {range}',
    values: {
      counts:
        [
          runCount('succeeded') > 0 &&
            i18n.translate('xpack.nightshift.automations.detail.successfulCount', {
              defaultMessage: '{count} successful',
              values: { count: runCount('succeeded') },
            }),
          runCount('running') > 0 &&
            i18n.translate('xpack.nightshift.automations.detail.runningCount', {
              defaultMessage: '{count} running',
              values: { count: runCount('running') },
            }),
          runCount('failed') > 0 &&
            i18n.translate('xpack.nightshift.automations.detail.failedCount', {
              defaultMessage: '{count} failed',
              values: { count: runCount('failed') },
            }),
        ]
          .filter(Boolean)
          .join(' · ') || '0',
      range: rangeLabel,
    },
  });

  const navigate = (path: string) => history.push(path);
  const hasUnsavedChanges = isEditing && isDirty;
  const requestClose = () => {
    if (hasUnsavedChanges) {
      setBlockedPath(undefined);
      setIsDiscardOpen(true);
      return;
    }
    onClose();
  };
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    return history.block(({ pathname: path, search: query, hash }) => {
      setBlockedPath(`${path}${query}${hash}`);
      setIsDiscardOpen(true);
      return false;
    });
  }, [hasUnsavedChanges, history]);
  useEffect(() => {
    if (!exit || isEditing) return;
    setExit(undefined);
    if (!exit.path) {
      onClose();
      return;
    }
    if (exit.path.startsWith(NIGHTSHIFT_APP_ROUTE)) {
      history.push(exit.path.slice(NIGHTSHIFT_APP_ROUTE.length) || '/');
      return;
    }
    void application.navigateToUrl(basePath.prepend(exit.path));
  }, [exit, isEditing, history, onClose, application, basePath]);
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
  const startEditing = (changes: Partial<AutomationFormValues> = {}) => {
    setValues({ ...originalValues, ...changes });
    setIsNameInvalid(false);
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
    if (!values.name.trim()) {
      setIsNameInvalid(true);
      return;
    }
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
            <EuiButtonEmpty
              iconType="undo"
              size="xs"
              color="text"
              data-test-subj="automationRunDetailBack"
              onClick={() => {
                setSelectedRun(undefined);
                navigate(`/automations/${automation.id}/runs`);
              }}
            >
              {labels.back}
            </EuiButtonEmpty>
          ) : isEditing ? (
            <EuiTitle size="xs">
              <h2 id={titleId}>{labels.editAutomation}</h2>
            </EuiTitle>
          ) : isInList ? (
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
          ) : null}
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
          <RunDetail
            run={selectedRun}
            automationName={automation.name}
            titleId={titleId}
            headerCss={headerCss}
            bodyCss={bodyCss}
          />
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
                      {automation.isEnabled ? labels.enabled : statusLabels.paused}
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
                                name: automation.name,
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
                        tooltip: runsTooltip,
                        onClick: () => navigate(`/automations/${automation.id}/runs`),
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
                              color: isLimitHigh ? limitColor : undefined,
                            }}
                          >
                            {usedToday} / {automation.runtime.dailyDispatchLimit ?? '—'}
                            <EuiSpacer size="xs" />
                            <EuiProgress
                              size="s"
                              color={isLimitHigh ? limitColor : 'success'}
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
                    isNameInvalid={isNameInvalid}
                    savedLimit={Number(originalValues.dailyDispatchLimit)}
                    onChange={(changes) => {
                      setValues((current) => ({ ...current, ...changes }));
                      if ('name' in changes) setIsNameInvalid(false);
                    }}
                  />
                ) : isRunsTab ? (
                  <RunHistory
                    key={initialRunFilter}
                    initialFilter={initialRunFilter}
                    runs={runs}
                    isLoading={runsQuery.isLoading}
                    startedAfter={runRange.startedAfter}
                    startedBefore={runRange.startedBefore}
                    rangeLabel={rangeLabel}
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
                      onRaiseLimit={
                        canManage
                          ? (limit) => startEditing({ dailyDispatchLimit: String(limit) })
                          : undefined
                      }
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
                    <EuiButton
                      data-test-subj="automationCancelEditButton"
                      size="s"
                      color="text"
                      onClick={() => {
                        setValues(originalValues);
                        setIsNameInvalid(false);
                        setIsEditing(false);
                      }}
                    >
                      {labels.cancel}
                    </EuiButton>
                    <EuiToolTip content={blocker}>
                      <EuiButton
                        fill
                        data-test-subj="automationSaveButton"
                        size="s"
                        disabled={!valid || !isDirty || updateAutomation.isLoading}
                        onClick={save}
                      >
                        {labels.save}
                      </EuiButton>
                    </EuiToolTip>
                  </>
                ) : (
                  canManage && (
                    <>
                      <EuiButton
                        data-test-subj="automationEditButton"
                        size="s"
                        iconType="pencil"
                        onClick={() => startEditing()}
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
                                    onClone(automation);
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
            setExit({ path: blockedPath });
          }}
          cancelButtonText={labels.keepEditing}
          confirmButtonText={labels.discard}
          buttonColor="danger"
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
