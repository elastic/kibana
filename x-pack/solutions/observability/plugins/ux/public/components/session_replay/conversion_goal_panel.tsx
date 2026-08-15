/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
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
  EuiPopover,
  EuiProgress,
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
import { useHistory } from 'react-router-dom';
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
import type { FunnelStepDef, SessionFunnelResponse } from '../../../common/session_funnel';
import { useLegacyUrlParams } from '../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import {
  createConversionGoal,
  deleteConversionGoal,
  fetchConversionGoals,
  updateConversionGoal,
} from '../../services/rest/conversion_goal_api';
import { fetchSessionFunnel } from '../../services/rest/session_replay_api';
import { mergeRumSearch } from '../../utils/rum_search';
import { ConversionGoalSequence } from './conversion_goal_sequence';

const percent = (ratio: number): string => `${Math.round(ratio * 1000) / 10}%`;

const goalIcon = (goal: { name: string; steps: FunnelStepDef[] }): string => {
  const hay = `${goal.name} ${goal.steps.map((step) => step.value).join(' ')}`.toLowerCase();
  if (/(sign|account|login|register)/.test(hay)) {
    return 'user';
  }
  if (hay.includes('search')) {
    return 'search';
  }
  if (/(cart|check|buy|purchase|order)/.test(hay)) {
    return 'currency';
  }
  return goal.steps[0]?.type === 'activity' ? 'tokenEvent' : 'cheer';
};

const toDraft = (goal: ConversionGoalDraft): ConversionGoalDraft => ({
  name: goal.name,
  steps: goal.steps.map((step) => ({ ...step })),
  value: goal.value,
  currency: goal.currency,
});

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
      includeRaw,
      analyticsMode,
    },
  } = useLegacyUrlParams();

  const [goals, setGoals] = useState<ConversionGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [editor, setEditor] = useState<ConversionGoalDraft & { selectedId: string | null }>(() => ({
    selectedId: null,
    ...createEmptyGoalDraft(),
  }));
  const [result, setResult] = useState<SessionFunnelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hydratedRef = useRef(false);
  const editorRef = useRef(editor);
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
        includeRaw: includeRaw === 'true',
        analyticsMode,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [http, kuery, rangeFrom, rangeTo, serviceName, includeRaw, analyticsMode]);

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

  const runSelectedGoal = (goal: ConversionGoal) => {
    editorRef.current = { selectedId: goal.id, ...toDraft(goal) };
    void runFunnel();
  };

  const startDraft = (preset?: ConversionGoalPreset) => {
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
    setGoalIdInUrl(null);
    setPresetOpen(false);
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
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.goals.savedToast', {
          defaultMessage: 'Conversion goal saved',
        })
      );
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
        applyGoal(list[0], true);
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
  const startCount = result?.steps[0]?.count ?? 0;
  const maxCount = Math.max(startCount, 1);

  const shellCss = css`
    padding: ${euiTheme.size.m};
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBaseSubdued};
  `;

  const tileCss = (active: boolean) => css`
    min-width: 160px;
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border: ${euiTheme.border.width.thin} solid
      ${active ? euiTheme.colors.primary : euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBasePlain};
    cursor: pointer;
    text-align: left;
  `;

  return (
    <div css={shellCss} data-test-subj="uxConversionGoalPanel">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="cheer" color="success" size="l" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ux.goals.panelTitle', {
                defaultMessage: 'Conversion goals',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.ux.goals.panelDescription', {
              defaultMessage:
                'Save a step sequence and a value per conversion. Next visit, pick the goal and run it again.',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        {goalsLoading && goals.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        ) : (
          goals.map((goal) => {
            const active = goal.id === editor.selectedId;
            return (
              <EuiFlexItem grow={false} key={goal.id}>
                <button
                  type="button"
                  css={tileCss(active)}
                  aria-pressed={active}
                  data-test-subj={`uxGoalTile-${goal.id}`}
                  onClick={() => {
                    applyGoal(goal, true);
                    runSelectedGoal(goal);
                  }}
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={goalIcon(goal)}
                        color={active ? 'primary' : 'subdued'}
                        aria-hidden={true}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{goal.name}</strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {goal.value > 0
                          ? i18n.translate('xpack.ux.goals.tileMetaWithValueLabel', {
                              defaultMessage:
                                '{value} · {count, plural, one {# step} other {# steps}}',
                              values: {
                                value: formatGoalMoney(goal.value, goal.currency),
                                count: goal.steps.length,
                              },
                            })
                          : i18n.translate('xpack.ux.goals.tileMetaStepsOnlyLabel', {
                              defaultMessage: '{count, plural, one {# step} other {# steps}}',
                              values: { count: goal.steps.length },
                            })}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </button>
              </EuiFlexItem>
            );
          })
        )}
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.translate('xpack.ux.goals.newGoalPresetsAriaLabel', {
              defaultMessage: 'New goal presets',
            })}
            button={
              <EuiButtonEmpty
                data-test-subj="uxGoalNewButton"
                size="s"
                iconType="plusInCircle"
                onClick={() => setPresetOpen((open) => !open)}
              >
                {i18n.translate('xpack.ux.goals.newButtonLabel', { defaultMessage: 'New goal' })}
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

      <EuiSpacer size="m" />

      <ConversionGoalSequence
        steps={editor.steps}
        onChange={(steps) => setEditor((current) => ({ ...current, steps }))}
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
                setEditor((current) => ({ ...current, name: event.target.value }))
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
              prepend={<EuiIcon type="currency" size="s" aria-hidden={true} />}
              onChange={(event) =>
                setEditor((current) => ({
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
                setEditor((current) => ({ ...current, currency: event.target.value }))
              }
              data-test-subj="uxGoalCurrency"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            iconType="play"
            onClick={() => void runFunnel()}
            isLoading={loading}
            data-test-subj="uxGoalRunButton"
          >
            {i18n.translate('xpack.ux.goals.runButtonLabel', { defaultMessage: 'Run funnel' })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="save"
            onClick={() => void onSave()}
            isLoading={saving}
            isDisabled={!dirty || !canSave}
            data-test-subj="uxGoalSaveButton"
          >
            {editor.selectedId
              ? i18n.translate('xpack.ux.goals.updateButtonLabel', { defaultMessage: 'Update' })
              : i18n.translate('xpack.ux.goals.saveButtonLabel', { defaultMessage: 'Save goal' })}
          </EuiButton>
        </EuiFlexItem>
        {editor.selectedId && (
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
        )}
      </EuiFlexGroup>

      {dirty && (
        <>
          <EuiSpacer size="s" />
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
      )}

      <EuiSpacer size="m" />

      {error && (
        <>
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
          <EuiSpacer size="m" />
        </>
      )}

      {loading && !result ? (
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
          maxCount={maxCount}
        />
      ) : null}

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

function GoalResults({
  result,
  impact,
  value,
  currency,
  maxCount,
}: {
  result: SessionFunnelResponse;
  impact: ReturnType<typeof computeGoalImpact>;
  value: number;
  currency: string;
  maxCount: number;
}) {
  const history = useHistory();
  const showMoney = value > 0;

  return (
    <>
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
      <EuiSpacer size="l" />

      {result.steps.map((step, index) => (
        <div key={`${step.type}-${step.value}-${index}`}>
          {index > 0 && (
            <EuiText size="xs" color="subdued" style={{ margin: '4px 0 8px 0' }}>
              {i18n.translate('xpack.ux.goals.dropOffLabel', {
                defaultMessage: '{count} dropped off ({rate} of previous step)',
                values: {
                  count: step.dropOffCount,
                  rate: percent(1 - step.conversionFromPrevious),
                },
              })}
              {showMoney && step.dropOffCount > 0 && (
                <>
                  {' · '}
                  <strong>
                    {formatGoalMoney(step.dropOffCount * value, currency)}
                    {i18n.translate('xpack.ux.goals.dropOffMoneySuffix', {
                      defaultMessage: ' missed here',
                    })}
                  </strong>
                </>
              )}
              {step.sampleDroppedSessionIds.length > 0 && (
                <>
                  {' · '}
                  {step.sampleDroppedSessionIds.map((sessionId, sIdx) => (
                    <span key={sessionId}>
                      {sIdx > 0 ? ', ' : ''}
                      <EuiLink
                        data-test-subj={`uxGoalDroppedSession-${sessionId}`}
                        href={history.createHref({
                          pathname: `/session-replay/${encodeURIComponent(sessionId)}`,
                        })}
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          history.push({
                            pathname: `/session-replay/${encodeURIComponent(sessionId)}`,
                          });
                        }}
                      >
                        {sessionId.slice(0, 8)}
                      </EuiLink>
                    </span>
                  ))}
                </>
              )}
            </EuiText>
          )}
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false} style={{ width: 180 }}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type={step.type === 'page' ? 'document' : 'tokenEvent'}
                    aria-hidden={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{step.label}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiProgress value={step.count} max={maxCount} color="primary" size="l" />
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ minWidth: 120, textAlign: 'right' }}>
              <EuiText size="s">
                <strong>{step.count}</strong>
                {' · '}
                {percent(step.conversionFromStart)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </div>
      ))}
    </>
  );
}
