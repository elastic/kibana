/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiProgress,
  EuiPopover,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { AreaSeries, Chart, CurveType } from '@elastic/charts';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import { buildNightshiftInvestigationFlyoutShareUrl } from '../../common/url_params';
import { AutomationFormBody } from '../flyouts/form/automation_form_body';
import {
  toAutomationFormValues,
  type AutomationFormValues,
} from '../flyouts/form/automation_form_values';
import { canSaveAutomation, getSaveBlocker, isTriggerValid } from '../flyouts/form/validation';
import { toAutomationUpdateBody } from '../flyouts/form/to_automation_request';
import {
  useAutomationRunsInRange,
  useCreateAutomation,
  useToggleAutomation,
  useUpdateAutomation,
  type Automation,
} from '../hooks/use_automations';
import { toCloneRequestBody } from '../utils/clone_automation';

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
  noTags: i18n.translate('xpack.nightshift.automations.detail.noTags', {
    defaultMessage: 'No tags.',
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
  noRuns: i18n.translate('xpack.nightshift.automations.detail.noRuns', {
    defaultMessage: 'No runs in the last 48 hours',
  }),
  noRunsBody: i18n.translate('xpack.nightshift.automations.detail.noRunsBody', {
    defaultMessage: 'Runs show up here each time a trigger fires.',
  }),
  noFilteredRuns: i18n.translate('xpack.nightshift.automations.detail.noFilteredRuns', {
    defaultMessage: 'No runs match this filter.',
  }),
  investigation: i18n.translate('xpack.nightshift.automations.detail.openInvestigation', {
    defaultMessage: 'Open investigation',
  }),
  previousDay: i18n.translate('xpack.nightshift.automations.detail.yesterday', {
    defaultMessage: 'Yesterday',
  }),
  today: i18n.translate('xpack.nightshift.automations.detail.today', { defaultMessage: 'Today' }),
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
  runsLast48Hours: i18n.translate('xpack.nightshift.automations.detail.runsLast48Hours', {
    defaultMessage: 'runs · Last 48 hours',
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
  trigger: i18n.translate('xpack.nightshift.automations.detail.trigger', {
    defaultMessage: 'Trigger',
  }),
  automation: i18n.translate('xpack.nightshift.automations.detail.automation', {
    defaultMessage: 'Automation',
  }),
  runs: i18n.translate('xpack.nightshift.automations.detail.runs', { defaultMessage: 'runs' }),
};

type RunStatus = 'succeeded' | 'running' | 'failed' | 'skipped';
interface Run {
  id: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  triggeredBy?: string;
  title?: string;
  message?: string;
  investigationId?: string;
  skipReason?: string | null;
  dailyLimit?: number;
}

const statusLabels: Record<RunStatus, string> = {
  succeeded: i18n.translate('xpack.nightshift.automations.detail.succeeded', {
    defaultMessage: 'Succeeded',
  }),
  running: i18n.translate('xpack.nightshift.automations.detail.running', {
    defaultMessage: 'Running',
  }),
  failed: i18n.translate('xpack.nightshift.automations.detail.failed', {
    defaultMessage: 'Failed',
  }),
  skipped: i18n.translate('xpack.nightshift.automations.detail.skipped', {
    defaultMessage: 'Skipped',
  }),
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

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
  const history = useHistory();
  const { pathname } = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [runFilter, setRunFilter] = useState<RunStatus | undefined>();
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
        target.closest('input, textarea, select, [role="dialog"], [role="menu"]')
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
            padding: 0 8px;
            min-height: 48px;
            border-bottom: 1px solid ${'var(--euiColorLightShade)'};
          `}
        >
          {isRunsTab && selectedRun ? (
            <EuiToolTip content={labels.runHistory} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="sortLeft"
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
                  aria-label={labels.previous}
                  data-test-subj="automationPreviousButton"
                  isDisabled={!previous}
                  onClick={() => previous && selectAutomation(previous)}
                />
              </EuiToolTip>
              <EuiToolTip content={labels.next} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="chevronSingleDown"
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
              aria-label={labels.close}
              onClick={requestClose}
            />
          </EuiToolTip>
        </div>
        {isRunsTab && selectedRun ? (
          <>
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="s">
                <h2 id={titleId}>{selectedRun.title || labels.automationRun}</h2>
              </EuiTitle>
              <EuiText size="xs" color="subdued">
                {statusLabels[selectedRun.status]} · {formatDate(selectedRun.startedAt)}
              </EuiText>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              {selectedRun.status === 'skipped' ? (
                <EuiDescriptionList
                  type="column"
                  listItems={[
                    { title: labels.triggered, description: formatDate(selectedRun.startedAt) },
                    { title: labels.source, description: selectedRun.triggeredBy ?? '—' },
                    { title: labels.message, description: selectedRun.message ?? '—' },
                    { title: labels.automation, description: automation.name },
                    {
                      title: labels.reason,
                      description:
                        selectedRun.skipReason === 'daily_limit'
                          ? i18n.translate('xpack.nightshift.automations.detail.dailyLimitReason', {
                              defaultMessage:
                                'Daily trigger limit of {limit} was already reached, so this trigger did not start a run.',
                              values: { limit: selectedRun.dailyLimit ?? '—' },
                            })
                          : '—',
                    },
                  ]}
                />
              ) : (
                <>
                  <EuiTitle size="xs">
                    <h3>{labels.run}</h3>
                  </EuiTitle>
                  <EuiDescriptionList
                    type="column"
                    listItems={[
                      { title: labels.source, description: selectedRun.triggeredBy ?? '—' },
                      { title: labels.message, description: selectedRun.message ?? '—' },
                      { title: labels.started, description: formatDate(selectedRun.startedAt) },
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
                    <EuiButton
                      data-test-subj="automationRunOpenInvestigation"
                      href={buildNightshiftInvestigationFlyoutShareUrl(selectedRun.investigationId)}
                    >
                      {labels.investigation}
                    </EuiButton>
                  )}
                </>
              )}
            </EuiFlyoutBody>
          </>
        ) : (
          <>
            {!isEditing && !selectedRun && (
              <EuiFlyoutHeader hasBorder>
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
                  <EuiFlexItem>
                    <EuiTitle size="s">
                      <h2 id={titleId}>{automation.name}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadgeGroup gutterSize="xs">
                      <EuiBadge color="hollow">{labels.title}</EuiBadge>
                      <EuiBadge color={automation.isEnabled ? 'success' : 'hollow'}>
                        {automation.isEnabled ? labels.enabled : labels.disabled}
                      </EuiBadge>
                    </EuiBadgeGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutHeader>
            )}
            {!isEditing && !selectedRun && !isRunsTab && (
              <div
                css={css`
                  display: grid;
                  grid-template-columns: repeat(4, minmax(140px, 1fr));
                  gap: 12px;
                  padding: 12px;
                  border-bottom: 1px solid ${'var(--euiColorLightShade)'};
                `}
              >
                <div>
                  <EuiText size="xs" color="subdued">
                    Enabled
                  </EuiText>
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
                </div>
                <div>
                  <EuiText size="xs" color="subdued">
                    {labels.author}
                  </EuiText>
                  <EuiText size="s">{automation.author ?? '—'}</EuiText>
                </div>
                <div>
                  <EuiText size="xs" color="subdued">
                    Runs
                  </EuiText>
                  <EuiText size="s">{runsQuery.data?.total ?? 0}</EuiText>
                </div>
                <div>
                  <EuiText size="xs" color="subdued">
                    {labels.todayUsage}
                  </EuiText>
                  <EuiText size="s">
                    {usedToday} / {automation.runtime.dailyDispatchLimit ?? '—'}
                  </EuiText>
                  <EuiProgress
                    size="s"
                    value={usedToday}
                    max={automation.runtime.dailyDispatchLimit ?? 1}
                  />
                </div>
              </div>
            )}
            {!isEditing && !selectedRun && (
              <EuiTabs css={{ padding: '8px 16px 0' }}>
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
            )}
            <EuiFlyoutBody>
              {isEditing ? (
                <AutomationFormBody
                  values={values}
                  tagSuggestions={automations.flatMap(({ tags }) => tags ?? [])}
                  isNameInvalid={!values.name.trim()}
                  onChange={(changes) => setValues((current) => ({ ...current, ...changes }))}
                />
              ) : isRunsTab ? (
                <RunHistory
                  runs={runs}
                  isLoading={runsQuery.isLoading}
                  filter={runFilter}
                  onFilter={setRunFilter}
                  onSelect={setSelectedRun}
                />
              ) : (
                <>
                  <section
                    css={css`
                      padding: 16px 0;
                      border-bottom: 1px solid ${'var(--euiColorLightShade)'};
                    `}
                  >
                    <EuiTitle size="xs">
                      <h3>{labels.description}</h3>
                    </EuiTitle>
                    <EuiText size="s" color={automation.description ? undefined : 'subdued'}>
                      {automation.description || labels.noDescription}
                    </EuiText>
                  </section>
                  <section
                    css={css`
                      padding: 16px 0;
                      border-bottom: 1px solid ${'var(--euiColorLightShade)'};
                    `}
                  >
                    <EuiTitle size="xs">
                      <h3>{labels.automationTags}</h3>
                    </EuiTitle>
                    {automation.tags?.length ? (
                      <EuiBadgeGroup gutterSize="xs">
                        {automation.tags.map((tag) => (
                          <EuiBadge key={tag} color="hollow">
                            {tag}
                          </EuiBadge>
                        ))}
                      </EuiBadgeGroup>
                    ) : (
                      <EuiText size="s" color="subdued">
                        {labels.noTags}
                      </EuiText>
                    )}
                  </section>
                  <AutomationFormBody
                    values={originalValues}
                    tagSuggestions={[]}
                    isNameInvalid={false}
                    readOnly
                    showIdentityFields={false}
                    onChange={() => {}}
                  />
                </>
              )}
            </EuiFlyoutBody>
            {!selectedRun && (
              <EuiFlyoutFooter>
                <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
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
                    <>
                      {canManage && (
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
                              iconType="chevronSingleDown"
                              iconSide="right"
                              onClick={() => setIsActionsOpen((open) => !open)}
                            >
                              {labels.actions}
                            </EuiButton>
                          }
                        >
                          <EuiContextMenuPanel
                            css={{ width: 240 }}
                            items={[
                              <EuiContextMenuItem
                                key="edit"
                                icon="pencil"
                                data-test-subj="automationEditButton"
                                onClick={() => {
                                  setValues(originalValues);
                                  setIsEditing(true);
                                  setIsActionsOpen(false);
                                }}
                              >
                                {labels.edit}
                              </EuiContextMenuItem>,
                              <EuiContextMenuItem
                                key="clone"
                                icon="copy"
                                data-test-subj="automationCloneButton"
                                onClick={() => {
                                  createAutomation.mutate(toCloneRequestBody(automation));
                                  setIsActionsOpen(false);
                                }}
                              >
                                {labels.clone}
                              </EuiContextMenuItem>,
                              <EuiContextMenuItem
                                key="delete"
                                icon="trash"
                                data-test-subj="automationDeleteButton"
                                onClick={() => {
                                  onDelete(automation);
                                  setIsActionsOpen(false);
                                }}
                              >
                                {labels.delete}
                              </EuiContextMenuItem>,
                            ]}
                          />
                        </EuiPopover>
                      )}
                    </>
                  )}
                </EuiFlexGroup>
              </EuiFlyoutFooter>
            )}
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
        >{`You have unsaved changes to ${automation.name}. If you leave now, your edits will be lost.`}</EuiConfirmModal>
      )}
    </EuiFlyout>
  );
};

const RunHistory = ({
  runs,
  isLoading,
  filter,
  onFilter,
  onSelect,
}: {
  runs: Run[];
  isLoading: boolean;
  filter?: RunStatus;
  onFilter: (status?: RunStatus) => void;
  onSelect: (run: Run) => void;
}) => {
  const visibleRuns = filter ? runs.filter((run) => run.status === filter) : runs;
  if (isLoading) return <EuiLoadingSpinner size="l" />;
  if (!runs.length)
    return <EuiEmptyPrompt title={<h3>{labels.noRuns}</h3>} body={<p>{labels.noRunsBody}</p>} />;
  const counts = (Object.keys(statusLabels) as RunStatus[])
    .map((status) => ({ status, count: runs.filter((run) => run.status === status).length }))
    .filter(({ count }) => count > 0);
  const chartData = (Object.keys(statusLabels) as RunStatus[]).map((status) =>
    runs.map(
      (run) => [Date.parse(run.startedAt), run.status === status ? 1 : 0] as [number, number]
    )
  );
  const dayKey = (run: Run) => new Date(run.startedAt).toDateString();
  const groups = [...new Set(visibleRuns.map(dayKey))].map((day) => ({
    day,
    runs: visibleRuns.filter((run) => dayKey(run) === day),
  }));
  return (
    <>
      <div
        css={css`
          position: sticky;
          top: 0;
          background: var(--euiPageBackgroundColor);
          z-index: 1;
          padding: 8px 0;
        `}
      >
        <EuiFlexGroup alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {counts.map(({ status, count }) => (
                <EuiFlexItem key={status} grow={false}>
                  <EuiButton
                    data-test-subj={`automationRunFilter-${status}`}
                    size="s"
                    color={filter === status ? 'primary' : 'text'}
                    onClick={() => onFilter(filter === status ? undefined : status)}
                  >
                    {statusLabels[status]} {count}
                  </EuiButton>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {runs.filter(({ status }) => status !== 'skipped').length} {labels.runsLast48Hours}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div css={{ height: 180 }}>
          <Chart size={{ height: 180 }}>
            <AreaSeries
              id="succeeded"
              name="Succeeded"
              data={chartData[0]}
              xAccessor={0}
              yAccessors={[1]}
              stackAccessors={[0]}
              curve={CurveType.CURVE_STEP}
            />
            <AreaSeries
              id="running"
              name="Running"
              data={chartData[1]}
              xAccessor={0}
              yAccessors={[1]}
              stackAccessors={[0]}
              curve={CurveType.CURVE_STEP}
            />
            <AreaSeries
              id="failed"
              name="Failed"
              data={chartData[2]}
              xAccessor={0}
              yAccessors={[1]}
              stackAccessors={[0]}
              curve={CurveType.CURVE_STEP}
            />
            <AreaSeries
              id="skipped"
              name="Skipped"
              data={chartData[3]}
              xAccessor={0}
              yAccessors={[1]}
              stackAccessors={[0]}
              curve={CurveType.CURVE_STEP}
            />
          </Chart>
        </div>
      </div>
      {!visibleRuns.length ? (
        <EuiText size="s" color="subdued">
          {labels.noFilteredRuns}
        </EuiText>
      ) : (
        groups.map(({ day, runs: dayRuns }) => (
          <section
            key={day}
            css={css`
              margin: 16px 0;
            `}
          >
            <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>
                    {day === new Date().toDateString()
                      ? labels.today
                      : day === new Date(Date.now() - 86400000).toDateString()
                      ? labels.previousDay
                      : day}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {dayRuns.length} {labels.runs}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            {dayRuns.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelect(run)}
                css={css`
                  width: 100%;
                  border: 1px solid var(--euiColorLightShade);
                  background: transparent;
                  text-align: left;
                  padding: 12px;
                  cursor: pointer;
                `}
              >
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={
                        run.status === 'running'
                          ? 'hourglass'
                          : run.status === 'succeeded'
                          ? 'checkInCircleFilled'
                          : run.status === 'failed'
                          ? 'error'
                          : 'clock'
                      }
                      aria-hidden={true}
                      color={
                        run.status === 'failed'
                          ? 'danger'
                          : run.status === 'succeeded'
                          ? 'success'
                          : 'subdued'
                      }
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued">
                      {formatDate(run.startedAt)}
                    </EuiText>
                    <EuiText size="s">
                      <strong>{run.title || labels.automationRun}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {run.status === 'skipped'
                        ? i18n.translate('xpack.nightshift.automations.detail.skippedRunSummary', {
                            defaultMessage: '{source} · Daily trigger limit of {limit} reached',
                            values: {
                              source: run.triggeredBy ?? labels.trigger,
                              limit: run.dailyLimit ?? '—',
                            },
                          })
                        : run.triggeredBy ?? labels.automation}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </button>
            ))}
          </section>
        ))
      )}
    </>
  );
};
