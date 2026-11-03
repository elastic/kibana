/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiConfirmModal,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import {
  CONVERSION_CURRENCIES,
  CONVERSION_GOAL_NAME_MAX,
  CONVERSION_GOAL_PRESETS,
  CONVERSION_GOAL_VALUE_MAX,
  computeGoalImpact,
  conversionGoalDraftsEqual,
  createEmptyGoalDraft,
  formatGoalMoney,
  isRunnableGoal,
  sanitizeConversionGoal,
  type ConversionGoal,
  type ConversionGoalDraft,
  type ConversionGoalPreset,
} from '../../../common/conversion_goal';
import {
  formatSampleSessionId,
  type FunnelStepDef,
  type SessionFunnelResponse,
} from '../../../common/session_funnel';
import { useLegacyUrlParams } from '../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import {
  createConversionGoal,
  deleteConversionGoal,
  fetchConversionGoals,
  updateConversionGoal,
} from '../../services/rest/conversion_goal_api';
import { fetchSessionFunnel } from '../../services/rest/session_replay_api';
import { mergeRumSearch, pushRumPath, sessionsPatch } from '../../utils/rum_search';
import { serviceNameFromPath, uxAppPath } from '../../utils/ux_app_path';
import { ConversionFunnelGraph } from './conversion_funnel_graph';
import { UxTourAnchor } from '../app/rum_tour/ux_tour_anchor';
import { hasFunnelDropOff } from './conversion_funnel_graph_data';
import { ConversionGoalSequence } from './conversion_goal_sequence';

const percent = (ratio: number): string => `${Math.round(ratio * 1000) / 10}%`;

const goalIcon = (goal: { name: string; steps: FunnelStepDef[] }): string => {
  const hay = `${goal.name} ${goal.steps.map((step) => step.value).join(' ')}`.toLowerCase();
  if (/(sign|account|login|register)/.test(hay)) {
    return 'user';
  }
  if (hay.includes('search')) {
    return 'magnify';
  }
  if (/(cart|check|buy|purchase|order)/.test(hay)) {
    return 'money';
  }
  return goal.steps[0]?.type === 'activity' ? 'tokenEvent' : 'bullseye';
};

const toDraft = (goal: ConversionGoalDraft): ConversionGoalDraft => ({
  name: goal.name,
  steps: goal.steps.map((step) => ({ ...step })),
  value: goal.value,
  currency: goal.currency,
});

const funnelStepTrail = (steps: FunnelStepDef[]): string =>
  steps
    .map((step) => step.label?.trim() || step.value.trim())
    .filter((label) => label.length > 0)
    .join(' → ');

export interface FunnelPageLocationState {
  funnelPresetSteps?: FunnelStepDef[];
}

export function ConversionFunnelPage() {
  const history = useHistory();
  const location = useLocation<FunnelPageLocationState | undefined>();
  const presetSteps = location.state?.funnelPresetSteps ?? null;

  return (
    <EuiPanel paddingSize="m" data-test-subj="uxConversionFunnelPage">
      <UxTourAnchor stepId="funnels" display="block">
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.ux.funnels.pageTitle', {
              defaultMessage: 'Funnels',
            })}
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.funnels.pageDescription', {
              defaultMessage:
                'Select a funnel to see conversion for this time range. Open Edit when you need to change steps.',
            })}
          </p>
        </EuiText>
      </UxTourAnchor>
      <EuiSpacer size="m" />
      <ConversionGoalPanel
        presetSteps={presetSteps}
        onPresetConsumed={() => {
          history.replace({
            pathname: history.location.pathname,
            search: history.location.search,
          });
        }}
      />
    </EuiPanel>
  );
}

export function ConversionGoalPanel({
  presetSteps,
  onPresetConsumed,
}: {
  presetSteps: FunnelStepDef[] | null;
  onPresetConsumed: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const { http, notifications } = useKibanaServices();
  const history = useHistory();
  const {
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      kuery,
      goalId,
      analyticsMode,
    },
  } = useLegacyUrlParams();

  const [goals, setGoals] = useState<ConversionGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [editor, setEditor] = useState<ConversionGoalDraft & { selectedId: string | null }>(() => ({
    selectedId: null,
    ...createEmptyGoalDraft(),
  }));
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState<SessionFunnelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hydratedRef = useRef(false);
  const editorRef = useRef(editor);
  const previousIdRef = useRef<string | null>(null);
  editorRef.current = editor;

  const setGoalIdInUrl = useCallback(
    (id: string | null) => {
      history.replace({
        pathname: history.location.pathname,
        search: mergeRumSearch(history.location.search, { goalId: id ?? '' }),
      });
    },
    [history]
  );

  const loadGoals = useCallback(async (): Promise<ConversionGoal[]> => {
    const list = await fetchConversionGoals(http);
    setGoals(list);
    return list;
  }, [http]);

  useEffect(() => {
    let cancelled = false;
    setGoalsLoading(true);
    void loadGoals()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
        return [] as ConversionGoal[];
      })
      .finally(() => {
        if (!cancelled) {
          setGoalsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadGoals]);

  const applyGoal = useCallback(
    (goal: ConversionGoal, persistUrl: boolean) => {
      setEditor({
        selectedId: goal.id,
        ...toDraft(goal),
      });
      if (persistUrl) {
        setGoalIdInUrl(goal.id);
      }
    },
    [setGoalIdInUrl]
  );

  const runFunnel = useCallback(async () => {
    const draft = sanitizeConversionGoal(editorRef.current);
    if (!isRunnableGoal(draft.steps)) {
      setResult(null);
      setError(
        i18n.translate('xpack.ux.goals.minStepsErrorMessage', {
          defaultMessage: 'Add at least two steps with a page path or activity name.',
        })
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessionFunnel({
        http,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        steps: draft.steps,
        kuery,
        analyticsMode,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [http, kuery, rangeFrom, rangeTo, serviceName, analyticsMode]);

  useEffect(() => {
    if (hydratedRef.current || goalsLoading) {
      return;
    }
    hydratedRef.current = true;
    const wanted =
      typeof goalId === 'string' ? goals.find((goal) => goal.id === goalId) : undefined;
    const pick = wanted ?? goals[0];
    if (pick) {
      applyGoal(pick, !wanted);
      editorRef.current = { selectedId: pick.id, ...toDraft(pick) };
      setEditing(false);
    } else {
      setEditing(true);
    }
    void runFunnel();
  }, [applyGoal, goalId, goals, goalsLoading, runFunnel]);

  useEffect(() => {
    if (!presetSteps) {
      return;
    }
    const current = editorRef.current;
    setEditor({
      selectedId: null,
      name: i18n.translate('xpack.ux.goals.inspectedName', {
        defaultMessage: 'Inspected journey',
      }),
      steps: presetSteps.map((step) => ({ ...step })),
      value: current.value,
      currency: current.currency,
    });
    setGoalIdInUrl(null);
    setEditing(false);
    onPresetConsumed();
    editorRef.current = {
      ...editorRef.current,
      selectedId: null,
      steps: presetSteps,
    };
    void runFunnel();
  }, [onPresetConsumed, presetSteps, runFunnel, setGoalIdInUrl]);

  const selected = goals.find((goal) => goal.id === editor.selectedId);
  const dirty = !selected || !conversionGoalDraftsEqual(toDraft(selected), toDraft(editor));
  const draftForSave = sanitizeConversionGoal(editor);
  const canSave = isRunnableGoal(draftForSave.steps) && draftForSave.name.trim().length > 0;

  const currencyOptions = useMemo(() => {
    const codes = new Set<string>(CONVERSION_CURRENCIES);
    codes.add(editor.currency);
    return [...codes].map((code) => ({ value: code, text: code }));
  }, [editor.currency]);

  const openGoal = (goal: ConversionGoal) => {
    applyGoal(goal, true);
    editorRef.current = { selectedId: goal.id, ...toDraft(goal) };
    setEditing(false);
    void runFunnel();
  };

  const startDraft = (preset?: ConversionGoalPreset) => {
    previousIdRef.current = editor.selectedId;
    const next = preset
      ? {
          name: preset.name,
          steps: preset.steps.map((step) => ({ ...step })),
          value: preset.value,
          currency: preset.currency,
        }
      : createEmptyGoalDraft();
    setEditor({ selectedId: null, ...next });
    setResult(null);
    setError(null);
    setEditing(true);
    setGoalIdInUrl(null);
    setPresetOpen(false);
  };

  const cancelEdit = () => {
    if (selected) {
      applyGoal(selected, false);
      setEditing(false);
      setError(null);
      return;
    }
    const back = goals.find((goal) => goal.id === previousIdRef.current) ?? goals[0];
    if (back) {
      openGoal(back);
      return;
    }
    setEditing(true);
  };

  const onSave = async () => {
    if (!canSave) {
      setError(
        i18n.translate('xpack.ux.goals.minStepsErrorMessage', {
          defaultMessage: 'Add at least two steps with a page path or activity name.',
        })
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = editor.selectedId
        ? await updateConversionGoal(http, editor.selectedId, draftForSave)
        : await createConversionGoal(http, draftForSave);
      const list = await loadGoals();
      const next = list.find((goal) => goal.id === saved.id) ?? saved;
      applyGoal(next, true);
      editorRef.current = { selectedId: next.id, ...toDraft(next) };
      setEditing(false);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.goals.savedToast', {
          defaultMessage: 'Conversion goal saved',
        })
      );
      void runFunnel();
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.goals.saveErrorTitle', {
          defaultMessage: 'Could not save conversion goal',
        }),
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!editor.selectedId) {
      return;
    }
    setSaving(true);
    try {
      await deleteConversionGoal(http, editor.selectedId);
      const list = await loadGoals();
      setConfirmDelete(false);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.goals.deletedToast', {
          defaultMessage: 'Conversion goal deleted',
        })
      );
      if (list[0]) {
        openGoal(list[0]);
      } else {
        startDraft();
      }
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.goals.deleteErrorTitle', {
          defaultMessage: 'Could not delete conversion goal',
        }),
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const impact = result ? computeGoalImpact(result, editor.value) : null;
  const showDraftRow = editor.selectedId == null;

  return (
    <div data-test-subj="uxConversionGoalPanel">
      <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={true}>
        <EuiFlexItem grow={false} style={{ width: 280, minWidth: 240 }}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('xpack.ux.funnels.savedListTitle', {
                    defaultMessage: 'Saved funnels',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                aria-label={i18n.translate('xpack.ux.goals.newGoalPresetsAriaLabel', {
                  defaultMessage: 'New goal presets',
                })}
                button={
                  <EuiButtonEmpty
                    data-test-subj="uxGoalNewButton"
                    size="s"
                    iconType="plusCircle"
                    onClick={() => setPresetOpen((open) => !open)}
                  >
                    {i18n.translate('xpack.ux.goals.newButtonLabel', { defaultMessage: 'New' })}
                  </EuiButtonEmpty>
                }
                isOpen={presetOpen}
                closePopover={() => setPresetOpen(false)}
                panelPaddingSize="s"
              >
                <EuiFlexGroup direction="column" gutterSize="xs">
                  {CONVERSION_GOAL_PRESETS.map((preset) => (
                    <EuiFlexItem key={preset.id}>
                      <EuiButtonEmpty
                        size="s"
                        iconType={goalIcon(preset)}
                        onClick={() => startDraft(preset)}
                        data-test-subj={`uxGoalPreset-${preset.id}`}
                      >
                        {preset.name}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          {goalsLoading && goals.length === 0 ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${euiTheme.size.xs};
                max-height: 520px;
                overflow-y: auto;
              `}
            >
              {showDraftRow ? (
                <FunnelListRow
                  active={true}
                  icon="plusCircle"
                  name={
                    editor.name.trim() ||
                    i18n.translate('xpack.ux.funnels.draftListLabel', {
                      defaultMessage: 'Untitled funnel',
                    })
                  }
                  trail={funnelStepTrail(editor.steps)}
                  badge={i18n.translate('xpack.ux.goals.unsavedDraftBadge', {
                    defaultMessage: 'Not saved yet',
                  })}
                />
              ) : null}
              {goals.map((goal) => (
                <FunnelListRow
                  key={goal.id}
                  active={goal.id === editor.selectedId}
                  icon={goalIcon(goal)}
                  name={goal.name}
                  trail={funnelStepTrail(goal.steps)}
                  testSubj={`uxGoalTile-${goal.id}`}
                  onClick={() => openGoal(goal)}
                />
              ))}
            </div>
          )}
        </EuiFlexItem>

        <EuiFlexItem style={{ minWidth: 0 }}>
          <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m" wrap>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>{editor.name.trim() || untitledFallback()}</h3>
              </EuiTitle>
              {!editing ? (
                <EuiText size="s" color="subdued">
                  <p>{funnelStepTrail(editor.steps)}</p>
                </EuiText>
              ) : null}
              {dirty ? (
                <>
                  <EuiSpacer size="xs" />
                  <EuiBadge color="hollow" iconType="dot">
                    {editor.selectedId
                      ? i18n.translate('xpack.ux.goals.unsavedChangesBadge', {
                          defaultMessage: 'Unsaved changes',
                        })
                      : i18n.translate('xpack.ux.goals.unsavedDraftBadge', {
                          defaultMessage: 'Not saved yet',
                        })}
                  </EuiBadge>
                </>
              ) : null}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false} wrap>
                {editing ? (
                  <>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="s"
                        onClick={cancelEdit}
                        data-test-subj="uxGoalCancelEditButton"
                      >
                        {i18n.translate('xpack.ux.goals.cancelEditButtonLabel', {
                          defaultMessage: 'Cancel',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        fill
                        iconType="save"
                        onClick={() => void onSave()}
                        isLoading={saving}
                        isDisabled={!dirty || !canSave}
                        data-test-subj="uxGoalSaveButton"
                      >
                        {editor.selectedId
                          ? i18n.translate('xpack.ux.goals.updateButtonLabel', {
                              defaultMessage: 'Update',
                            })
                          : i18n.translate('xpack.ux.goals.saveButtonLabel', {
                              defaultMessage: 'Save funnel',
                            })}
                      </EuiButton>
                    </EuiFlexItem>
                  </>
                ) : (
                  <>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        iconType="pencil"
                        onClick={() => setEditing(true)}
                        data-test-subj="uxGoalEditButton"
                      >
                        {i18n.translate('xpack.ux.goals.editButtonLabel', {
                          defaultMessage: 'Edit',
                        })}
                      </EuiButton>
                    </EuiFlexItem>
                    {dirty && canSave ? (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          size="s"
                          iconType="save"
                          onClick={() => void onSave()}
                          isLoading={saving}
                          data-test-subj="uxGoalSaveButton"
                        >
                          {i18n.translate('xpack.ux.goals.saveButtonLabel', {
                            defaultMessage: 'Save funnel',
                          })}
                        </EuiButton>
                      </EuiFlexItem>
                    ) : null}
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        fill
                        iconType={result ? 'refresh' : 'play'}
                        onClick={() => void runFunnel()}
                        isLoading={loading}
                        data-test-subj="uxGoalRunButton"
                      >
                        {result
                          ? i18n.translate('xpack.ux.goals.refreshButtonLabel', {
                              defaultMessage: 'Refresh funnel',
                            })
                          : i18n.translate('xpack.ux.goals.runButtonLabel', {
                              defaultMessage: 'Run funnel',
                            })}
                      </EuiButton>
                    </EuiFlexItem>
                  </>
                )}
                {editor.selectedId ? (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate('xpack.ux.goals.deleteTooltip', {
                        defaultMessage: 'Delete saved goal',
                      })}
                    >
                      <EuiButtonIcon
                        aria-label={i18n.translate('xpack.ux.goals.deleteAriaLabel', {
                          defaultMessage: 'Delete saved goal',
                        })}
                        iconType="trash"
                        color="danger"
                        onClick={() => setConfirmDelete(true)}
                        data-test-subj="uxGoalDeleteButton"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          {editing ? (
            <FunnelEditor editor={editor} currencyOptions={currencyOptions} onChange={setEditor} />
          ) : error ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={i18n.translate('xpack.ux.goals.errorTitle', {
                defaultMessage: 'Could not run this goal',
              })}
            >
              <p>{error}</p>
            </EuiCallOut>
          ) : loading && !result ? (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate('xpack.ux.goals.loadingLabel', {
                    defaultMessage: 'Computing funnel…',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : result && result.steps.length > 0 && impact ? (
            <GoalResults
              result={result}
              impact={impact}
              value={editor.value}
              currency={editor.currency}
            />
          ) : (
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.ux.funnels.noResultsLabel', {
                defaultMessage: 'Run this funnel to see conversion for the selected time range.',
              })}
            </EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {confirmDelete && (
        <EuiConfirmModal
          aria-label={i18n.translate('xpack.ux.goals.deleteConfirmAriaLabel', {
            defaultMessage: 'Delete this conversion goal?',
          })}
          title={i18n.translate('xpack.ux.goals.deleteConfirmTitle', {
            defaultMessage: 'Delete this conversion goal?',
          })}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void onDelete()}
          cancelButtonText={i18n.translate('xpack.ux.goals.deleteCancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.ux.goals.deleteConfirmButtonLabel', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
        >
          <p>
            {i18n.translate('xpack.ux.goals.deleteConfirmDescription', {
              defaultMessage: '{name} will be removed. You can create it again later.',
              values: { name: editor.name },
            })}
          </p>
        </EuiConfirmModal>
      )}
    </div>
  );
}

const untitledFallback = (): string =>
  i18n.translate('xpack.ux.funnels.untitledDetailTitle', {
    defaultMessage: 'Untitled funnel',
  });

function FunnelListRow({
  active,
  icon,
  name,
  trail,
  badge,
  testSubj,
  onClick,
}: {
  active: boolean;
  icon: string;
  name: string;
  trail: string;
  badge?: string;
  testSubj?: string;
  onClick?: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <button
      type="button"
      data-test-subj={testSubj}
      aria-pressed={active}
      disabled={!onClick}
      onClick={onClick}
      css={css`
        display: block;
        width: 100%;
        text-align: left;
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border: 1px solid
          ${active ? euiTheme.colors.borderStrongPrimary : euiTheme.colors.borderBaseSubdued};
        border-radius: ${euiTheme.border.radius.medium};
        background: ${active
          ? euiTheme.colors.backgroundBasePrimary
          : euiTheme.colors.backgroundBasePlain};
        cursor: ${onClick ? 'pointer' : 'default'};
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} color={active ? 'primary' : 'subdued'} aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{name}</strong>
          </EuiText>
          {trail ? (
            <EuiText size="xs" color="subdued">
              <p
                css={css`
                  margin: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                `}
              >
                {trail}
              </p>
            </EuiText>
          ) : null}
          {badge ? (
            <>
              <EuiSpacer size="xs" />
              <EuiBadge color="hollow">{badge}</EuiBadge>
            </>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </button>
  );
}

function FunnelEditor({
  editor,
  currencyOptions,
  onChange,
}: {
  editor: ConversionGoalDraft & { selectedId: string | null };
  currencyOptions: Array<{ value: string; text: string }>;
  onChange: React.Dispatch<
    React.SetStateAction<ConversionGoalDraft & { selectedId: string | null }>
  >;
}) {
  return (
    <>
      {editor.selectedId == null ? (
        <>
          <EuiCallOut
            announceOnMount
            color="primary"
            size="s"
            title={i18n.translate('xpack.ux.funnels.newDraftCalloutTitle', {
              defaultMessage: 'New funnel',
            })}
          >
            <p>
              {i18n.translate('xpack.ux.funnels.newDraftCalloutBody', {
                defaultMessage: 'Set the steps and name, then save to add it to the list.',
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ) : null}

      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.ux.funnels.stepsTitle', {
            defaultMessage: 'Steps',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ConversionGoalSequence
        steps={editor.steps}
        onChange={(steps) => onChange((current) => ({ ...current, steps }))}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="flexEnd" wrap>
        <EuiFlexItem grow={2}>
          <EuiFormRow
            label={i18n.translate('xpack.ux.goals.nameLabel', { defaultMessage: 'Goal name' })}
          >
            <EuiFieldText
              compressed
              value={editor.name}
              maxLength={CONVERSION_GOAL_NAME_MAX}
              prepend={<EuiIcon type="flag" size="s" aria-hidden={true} />}
              onChange={(event) =>
                onChange((current) => ({ ...current, name: event.target.value }))
              }
              data-test-subj="uxGoalName"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 160 }}>
          <EuiFormRow
            label={i18n.translate('xpack.ux.goals.valueLabel', {
              defaultMessage: 'Value per conversion',
            })}
          >
            <EuiFieldNumber
              compressed
              min={0}
              max={CONVERSION_GOAL_VALUE_MAX}
              value={editor.value}
              prepend={<EuiIcon type="money" size="s" aria-hidden={true} />}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  value: event.target.value === '' ? 0 : Number(event.target.value),
                }))
              }
              data-test-subj="uxGoalValue"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 110 }}>
          <EuiFormRow
            label={i18n.translate('xpack.ux.goals.currencyLabel', { defaultMessage: 'Currency' })}
          >
            <EuiSelect
              compressed
              options={currencyOptions}
              value={editor.currency}
              onChange={(event) =>
                onChange((current) => ({ ...current, currency: event.target.value }))
              }
              data-test-subj="uxGoalCurrency"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function GoalResults({
  result,
  impact,
  value,
  currency,
}: {
  result: SessionFunnelResponse;
  impact: ReturnType<typeof computeGoalImpact>;
  value: number;
  currency: string;
}) {
  const showMoney = value > 0;
  const dropRows = result.steps.slice(1).map((step, index) => ({
    id: `${step.type}-${step.value}-${index}`,
    from: result.steps[index].label,
    to: step.label,
    dropOffCount: step.dropOffCount,
    rate: 1 - step.conversionFromPrevious,
    missed: step.dropOffCount * value,
    sampleDroppedSessionIds: step.sampleDroppedSessionIds,
  }));

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="uxGoalResultsPanel">
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.ux.funnels.resultsTitle', {
            defaultMessage: 'Results',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup wrap>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={String(impact.entered)}
            description={i18n.translate('xpack.ux.goals.enteredStat', {
              defaultMessage: 'Entered',
            })}
            titleSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={percent(impact.conversionRate)}
            description={i18n.translate('xpack.ux.goals.convertedStat', {
              defaultMessage: 'Converted',
            })}
            titleSize="s"
          />
        </EuiFlexItem>
        {showMoney && (
          <>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={formatGoalMoney(impact.attributed, currency)}
                description={i18n.translate('xpack.ux.goals.attributedStat', {
                  defaultMessage: 'Attributed',
                })}
                titleSize="s"
                titleColor="success"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={formatGoalMoney(impact.missed, currency)}
                description={i18n.translate('xpack.ux.goals.missedStat', {
                  defaultMessage: 'Missed',
                })}
                titleSize="s"
                titleColor="danger"
              />
            </EuiFlexItem>
          </>
        )}
        <EuiFlexItem grow={false}>
          <EuiStat
            title={String(result.sessionsConsidered)}
            description={i18n.translate('xpack.ux.goals.consideredStat', {
              defaultMessage: 'Sessions scanned',
            })}
            titleSize="s"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <ConversionFunnelGraph steps={result.steps} />

      {hasFunnelDropOff(result.steps) ? (
        <>
          <EuiSpacer size="m" />

          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.ux.funnels.dropOffTitle', {
                defaultMessage: 'Drop-off',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.ux.funnels.dropOffTableCaption', {
              defaultMessage: 'Drop-off between funnel steps',
            })}
            items={dropRows}
            itemId="id"
            rowHeader="to"
            columns={[
              {
                field: 'from',
                name: i18n.translate('xpack.ux.goals.dropOffFromColumnLabel', {
                  defaultMessage: 'From',
                }),
              },
              {
                field: 'to',
                name: i18n.translate('xpack.ux.goals.dropOffToColumnLabel', {
                  defaultMessage: 'To',
                }),
              },
              {
                field: 'dropOffCount',
                name: i18n.translate('xpack.ux.goals.dropOffCountColumnLabel', {
                  defaultMessage: 'Dropped',
                }),
              },
              {
                name: i18n.translate('xpack.ux.goals.dropOffRateColumnLabel', {
                  defaultMessage: 'Of previous',
                }),
                render: (row: (typeof dropRows)[number]) => percent(row.rate),
              },
              ...(showMoney
                ? [
                    {
                      name: i18n.translate('xpack.ux.goals.dropOffMissedColumnLabel', {
                        defaultMessage: 'Missed',
                      }),
                      render: (row: (typeof dropRows)[number]) =>
                        formatGoalMoney(row.missed, currency),
                    },
                  ]
                : []),
              {
                name: i18n.translate('xpack.ux.goals.dropOffSessionsColumnLabel', {
                  defaultMessage: 'Sessions',
                }),
                render: (row: (typeof dropRows)[number]) => (
                  <DropOffSessionsPopover rowId={row.id} sessionIds={row.sampleDroppedSessionIds} />
                ),
              },
            ]}
          />
        </>
      ) : null}
    </EuiPanel>
  );
}

function DropOffSessionsPopover({ rowId, sessionIds }: { rowId: string; sessionIds: string[] }) {
  const history = useHistory();
  const [open, setOpen] = useState(false);

  if (sessionIds.length === 0) {
    return (
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.ux.goals.dropOffNoSessionsLabel', {
          defaultMessage: '—',
        })}
      </EuiText>
    );
  }

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.ux.goals.dropOffSessionsPopoverAriaLabel', {
        defaultMessage: 'Dropped sessions',
      })}
      button={
        <EuiButtonEmpty
          size="s"
          flush="left"
          iconType="chevronSingleDown"
          iconSide="right"
          data-test-subj={`uxGoalDroppedSessions-${rowId}`}
          onClick={() => setOpen((current) => !current)}
        >
          {i18n.translate('xpack.ux.goals.dropOffViewSessionsButtonLabel', {
            defaultMessage: 'View {count, plural, one {# session} other {# sessions}}',
            values: { count: sessionIds.length },
          })}
        </EuiButtonEmpty>
      }
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downLeft"
    >
      <div
        css={css`
          min-width: 180px;
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="xs">
          {sessionIds.map((sessionId) => (
            <EuiFlexItem key={sessionId} grow={false}>
              <EuiLink
                data-test-subj={`uxGoalDroppedSession-${sessionId}`}
                href={history.createHref({
                  pathname: uxAppPath(
                    serviceNameFromPath(history.location.pathname),
                    `/session-replay/${encodeURIComponent(sessionId)}`
                  ),
                })}
                onClick={(event: React.MouseEvent) => {
                  event.preventDefault();
                  setOpen(false);
                  pushRumPath(history, `/session-replay/${encodeURIComponent(sessionId)}`);
                }}
              >
                {formatSampleSessionId(sessionId)}
              </EuiLink>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        {sessionIds.length > 1 ? (
          <>
            <EuiSpacer size="s" />
            <EuiButtonEmpty
              size="s"
              flush="left"
              iconType="popper"
              data-test-subj={`uxGoalDroppedSessionsAll-${rowId}`}
              onClick={() => {
                setOpen(false);
                pushRumPath(
                  history,
                  '/session-replay',
                  sessionsPatch({ sessionIds: sessionIds.join(',') })
                );
              }}
            >
              {i18n.translate('xpack.ux.goals.dropOffViewAllSessionsButtonLabel', {
                defaultMessage: 'Open all in Sessions',
              })}
            </EuiButtonEmpty>
          </>
        ) : null}
      </div>
    </EuiPopover>
  );
}
