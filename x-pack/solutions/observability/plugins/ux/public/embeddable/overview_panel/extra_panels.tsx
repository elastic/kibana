/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { CriteriaWithPagination, EuiBasicTableColumn, Pagination } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';
import {
  computeGoalImpact,
  isRunnableGoal,
  type ConversionGoal,
} from '../../../common/conversion_goal';
import {
  alertMatchesApp,
  budgetMatchesApp,
} from '../../../common/embeddables/overview_panel/extra_panel_scope';
import { overviewPanelStateToQuery } from '../../../common/embeddables/overview_panel/serialize_state';
import type { UxOverviewPanelCustomState } from '../../../common/embeddables/overview_panel/types';
import {
  rumBudgetInvestigatePatch,
  rumBudgetTemplateLabel,
  type RumBudgetItem,
} from '../../../common/rum_budgets';
import {
  rumAlertInvestigateTarget,
  rumAlertEpisodeRange,
  isRumAlertFireStatus,
} from '../../../common/rum_alert_episodes';
import { rumAlertTemplateLabel } from '../../../common/rum_alerts';
import type { RumSessionSummary, SessionListStats } from '../../../common/session_replay';
import type { SessionFunnelResponse } from '../../../common/session_funnel';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchConversionGoals } from '../../services/rest/conversion_goal_api';
import {
  fetchRumAlertStatus,
  fetchRumAlerts,
  type RumAlertRuleSummary,
} from '../../services/rest/rum_alerts_api';
import { fetchRumBudgets } from '../../services/rest/rum_budgets_api';
import {
  fetchSessionFunnel,
  fetchSessionReplaySessions,
} from '../../services/rest/session_replay_api';
import { ConversionFunnelGraph } from '../../components/session_replay/conversion_funnel_graph';
import {
  formatDurationMs,
  formatRelativeTime,
  formatTime,
  JourneyTrail,
  SignalBadges,
  UserCell,
} from '../../components/session_replay/session_ui';
import { pushRumPath, sessionsPatch } from '../../utils/rum_search';

const SESSION_PAGE_SIZE = 8;

const percent = (ratio: number): string => {
  if (!Number.isFinite(ratio)) {
    return '—';
  }
  return `${Math.round(ratio * 1000) / 10}%`;
};

const PanelSpinner = () => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      minHeight: 160,
    }}
  >
    <EuiLoadingSpinner size="l" />
  </div>
);

const PanelError = ({ message }: { message: string }) => (
  <EuiCallOut
    announceOnMount
    size="s"
    color="danger"
    title={i18n.translate('xpack.ux.dashboard.embeddable.errorTitle', {
      defaultMessage: 'Unable to load this panel',
    })}
  >
    <p>{message}</p>
  </EuiCallOut>
);

export function UxWorkflowEmbeddableBody({
  state,
  rangeFrom,
  rangeTo,
}: {
  state: UxOverviewPanelCustomState;
  rangeFrom: string;
  rangeTo: string;
}) {
  switch (state.panel) {
    case 'sessions':
      return <SessionsEmbeddable state={state} rangeFrom={rangeFrom} rangeTo={rangeTo} />;
    case 'funnels':
      return <FunnelsEmbeddable state={state} rangeFrom={rangeFrom} rangeTo={rangeTo} />;
    case 'budgets':
      return <BudgetsEmbeddable serviceName={state.service_name} />;
    case 'alerts':
      return <AlertsEmbeddable serviceName={state.service_name} />;
    default:
      return null;
  }
}

function SessionsEmbeddable({
  state,
  rangeFrom,
  rangeTo,
}: {
  state: UxOverviewPanelCustomState;
  rangeFrom: string;
  rangeTo: string;
}) {
  const { http } = useKibanaServices();
  const history = useHistory();
  const [sessions, setSessions] = useState<RumSessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<SessionListStats | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const serializedKey = JSON.stringify({ ...state, range_from: rangeFrom, range_to: rangeTo });

  useEffect(() => {
    setPageIndex(0);
  }, [serializedKey]);

  useEffect(() => {
    const query = overviewPanelStateToQuery(
      JSON.parse(serializedKey) as UxOverviewPanelCustomState
    );
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchSessionReplaySessions({
      http,
      ...query,
      page: pageIndex,
      perPage: SESSION_PAGE_SIZE,
      sortField: 'startTime',
      sortDirection: 'desc',
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setSessions(result.sessions);
        setTotal(result.total);
        setStats(result.stats);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setSessions([]);
          setTotal(0);
          setStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [http, pageIndex, serializedKey]);

  const openPlayer = useCallback(
    (sessionId: string) => {
      pushRumPath(history, `/session-replay/${encodeURIComponent(sessionId)}/replay`);
    },
    [history]
  );

  const openDetail = useCallback(
    (sessionId: string) => {
      pushRumPath(history, `/session-replay/${encodeURIComponent(sessionId)}`);
    },
    [history]
  );

  const columns: Array<EuiBasicTableColumn<RumSessionSummary>> = [
    {
      field: 'user',
      name: i18n.translate('xpack.ux.dashboard.sessions.userLabel', { defaultMessage: 'User' }),
      width: '180px',
      render: (_user: RumSessionSummary['user'], item: RumSessionSummary) => (
        <UserCell user={item.user} client={item.client} />
      ),
    },
    {
      field: 'pagePath',
      name: i18n.translate('xpack.ux.dashboard.sessions.journeyLabel', {
        defaultMessage: 'Journey',
      }),
      render: (_path: string[], item: RumSessionSummary) => <JourneyTrail session={item} />,
    },
    {
      field: 'errorCount',
      name: i18n.translate('xpack.ux.dashboard.sessions.signalsLabel', {
        defaultMessage: 'Signals',
      }),
      width: '120px',
      render: (_count: number, item: RumSessionSummary) => <SignalBadges session={item} />,
    },
    {
      field: 'startTime',
      name: i18n.translate('xpack.ux.dashboard.sessions.startLabel', { defaultMessage: 'Start' }),
      width: '120px',
      render: (startTime: string | null) => (
        <EuiToolTip content={formatTime(startTime)}>
          <EuiText size="s" tabIndex={0}>
            {formatRelativeTime(startTime)}
          </EuiText>
        </EuiToolTip>
      ),
    },
    {
      field: 'durationMs',
      name: i18n.translate('xpack.ux.dashboard.sessions.durationLabel', {
        defaultMessage: 'Duration',
      }),
      width: '90px',
      render: (durationMs: number) => <EuiText size="s">{formatDurationMs(durationMs)}</EuiText>,
    },
    {
      name: i18n.translate('xpack.ux.dashboard.sessions.actionsLabel', {
        defaultMessage: 'Actions',
      }),
      width: '110px',
      actions: [
        {
          name: i18n.translate('xpack.ux.dashboard.sessions.detailsAction', {
            defaultMessage: 'Details',
          }),
          description: i18n.translate('xpack.ux.dashboard.sessions.detailsAction', {
            defaultMessage: 'Details',
          }),
          icon: 'inspect',
          type: 'icon',
          onClick: (item: RumSessionSummary) => openDetail(item.sessionId),
        },
        {
          name: i18n.translate('xpack.ux.dashboard.sessions.playAction', {
            defaultMessage: 'Play',
          }),
          description: i18n.translate('xpack.ux.dashboard.sessions.playAction', {
            defaultMessage: 'Play',
          }),
          icon: 'play',
          type: 'icon',
          available: (item: RumSessionSummary) => item.hasReplay,
          onClick: (item: RumSessionSummary) => openPlayer(item.sessionId),
        },
      ],
    },
  ];

  if (loading && !stats) {
    return <PanelSpinner />;
  }
  if (error) {
    return <PanelError message={error} />;
  }

  const pagination: Pagination = {
    pageIndex,
    pageSize: SESSION_PAGE_SIZE,
    totalItemCount: total,
    showPerPageOptions: false,
  };

  return (
    <div data-test-subj="uxDashboardSessions">
      {stats ? (
        <>
          <EuiFlexGroup responsive={false} gutterSize="l" wrap>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={String(stats.total)}
                description={i18n.translate('xpack.ux.dashboard.sessions.totalStat', {
                  defaultMessage: 'Sessions',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={String(stats.withReplay)}
                description={i18n.translate('xpack.ux.dashboard.sessions.replayStat', {
                  defaultMessage: 'With replay',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={String(stats.withErrors)}
                description={i18n.translate('xpack.ux.dashboard.sessions.errorsStat', {
                  defaultMessage: 'With errors',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={String(stats.rageClicks)}
                description={i18n.translate('xpack.ux.dashboard.sessions.rageStat', {
                  defaultMessage: 'Rage clicks',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      ) : null}
      {sessions.length === 0 ? (
        <EuiEmptyPrompt
          title={
            <h3>
              {i18n.translate('xpack.ux.dashboard.sessions.emptyTitle', {
                defaultMessage: 'No sessions in this range',
              })}
            </h3>
          }
          actions={
            <EuiButton
              size="s"
              data-test-subj="uxDashboardSessionsOpen"
              onClick={() => pushRumPath(history, '/session-replay', sessionsPatch({}))}
            >
              {i18n.translate('xpack.ux.dashboard.sessions.openButton', {
                defaultMessage: 'Open sessions',
              })}
            </EuiButton>
          }
        />
      ) : (
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.dashboard.sessions.tableCaption', {
            defaultMessage: 'Recent sessions',
          })}
          items={sessions}
          columns={columns}
          loading={loading}
          pagination={pagination}
          onChange={({ page }: CriteriaWithPagination<RumSessionSummary>) => {
            if (page) {
              setPageIndex(page.index);
            }
          }}
        />
      )}
    </div>
  );
}

function FunnelsEmbeddable({
  state,
  rangeFrom,
  rangeTo,
}: {
  state: UxOverviewPanelCustomState;
  rangeFrom: string;
  rangeTo: string;
}) {
  const { http } = useKibanaServices();
  const history = useHistory();
  const [goals, setGoals] = useState<ConversionGoal[]>([]);
  const [goalId, setGoalId] = useState<string | undefined>();
  const [result, setResult] = useState<SessionFunnelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const query = overviewPanelStateToQuery({ ...state, range_from: rangeFrom, range_to: rangeTo });
  const selected = goals.find((goal) => goal.id === goalId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchConversionGoals(http)
      .then((list) => {
        if (cancelled) {
          return;
        }
        const runnable = list.filter((goal) => isRunnableGoal(goal.steps));
        setGoals(runnable);
        setGoalId((current) =>
          current && runnable.some((goal) => goal.id === current) ? current : runnable[0]?.id
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setGoals([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [http]);

  useEffect(() => {
    if (!selected) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchSessionFunnel({
      http,
      rangeFrom: query.rangeFrom,
      rangeTo: query.rangeTo,
      serviceName: query.serviceName,
      kuery: query.kuery,
      analyticsMode: query.analyticsMode,
      steps: selected.steps,
    })
      .then((data) => {
        if (!cancelled) {
          setResult(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    http,
    query.analyticsMode,
    query.kuery,
    query.rangeFrom,
    query.rangeTo,
    query.serviceName,
    selected,
  ]);

  if (loading && goals.length === 0 && !error) {
    return <PanelSpinner />;
  }
  if (error) {
    return <PanelError message={error} />;
  }
  if (goals.length === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h3>
            {i18n.translate('xpack.ux.dashboard.funnels.emptyTitle', {
              defaultMessage: 'No funnels yet',
            })}
          </h3>
        }
        actions={
          <EuiButton
            size="s"
            data-test-subj="uxDashboardFunnelsOpen"
            onClick={() => pushRumPath(history, '/funnels')}
          >
            {i18n.translate('xpack.ux.dashboard.funnels.openButton', {
              defaultMessage: 'Open funnels',
            })}
          </EuiButton>
        }
      />
    );
  }

  const impact = result ? computeGoalImpact(result, selected?.value ?? 0) : null;

  return (
    <div data-test-subj="uxDashboardFunnels">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {goals.length > 1 ? (
          <EuiFlexItem grow={false}>
            <EuiSelect
              compressed
              options={goals.map((goal) => ({ value: goal.id, text: goal.name }))}
              value={goalId}
              onChange={(event) => setGoalId(event.target.value)}
              aria-label={i18n.translate('xpack.ux.dashboard.funnels.selectAria', {
                defaultMessage: 'Funnel',
              })}
              data-test-subj="uxDashboardFunnelsSelect"
            />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{selected?.name}</strong>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {loading && !result ? (
        <PanelSpinner />
      ) : impact && result ? (
        <>
          <EuiFlexGroup wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={String(impact.entered)}
                description={i18n.translate('xpack.ux.dashboard.funnels.enteredStat', {
                  defaultMessage: 'Entered',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={percent(impact.conversionRate)}
                description={i18n.translate('xpack.ux.dashboard.funnels.convertedStat', {
                  defaultMessage: 'Converted',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={String(result.sessionsConsidered)}
                description={i18n.translate('xpack.ux.dashboard.funnels.scannedStat', {
                  defaultMessage: 'Sessions scanned',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <ConversionFunnelGraph steps={result.steps} />
        </>
      ) : null}
    </div>
  );
}

function BudgetsEmbeddable({ serviceName }: { serviceName?: string }) {
  const { http, application } = useKibanaServices();
  const history = useHistory();
  const [items, setItems] = useState<RumBudgetItem[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canRead = Boolean(application.capabilities.slo?.read);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchRumBudgets(http)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setAvailable(result.available);
        setItems(result.items.filter((item) => budgetMatchesApp(item, serviceName)));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [http, serviceName]);

  const healthy = items.filter((item) => item.status === 'HEALTHY').length;
  const burning = items.filter(
    (item) => item.status === 'DEGRADING' || item.status === 'VIOLATED'
  ).length;

  const columns: Array<EuiBasicTableColumn<RumBudgetItem>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.ux.dashboard.budgets.nameLabel', { defaultMessage: 'Budget' }),
      render: (name: string) => name,
    },
    {
      field: 'templateId',
      name: i18n.translate('xpack.ux.dashboard.budgets.templateLabel', {
        defaultMessage: 'Template',
      }),
      width: '140px',
      render: (templateId: RumBudgetItem['templateId']) =>
        templateId ? rumBudgetTemplateLabel(templateId) : '—',
    },
    {
      field: 'status',
      name: i18n.translate('xpack.ux.dashboard.budgets.statusLabel', { defaultMessage: 'Status' }),
      width: '110px',
      render: (status: RumBudgetItem['status']) => (
        <EuiHealth
          color={
            status === 'HEALTHY'
              ? 'success'
              : status === 'NO_DATA'
              ? 'subdued'
              : status === 'DEGRADING'
              ? 'warning'
              : 'danger'
          }
        >
          {status === 'HEALTHY'
            ? i18n.translate('xpack.ux.budgets.status.healthyLabel', { defaultMessage: 'Healthy' })
            : status === 'DEGRADING'
            ? i18n.translate('xpack.ux.budgets.status.degradingLabel', {
                defaultMessage: 'Burning',
              })
            : status === 'VIOLATED'
            ? i18n.translate('xpack.ux.budgets.status.violatedLabel', {
                defaultMessage: 'Exhausted',
              })
            : i18n.translate('xpack.ux.budgets.status.noDataLabel', {
                defaultMessage: 'No data',
              })}
        </EuiHealth>
      ),
    },
    {
      field: 'errorBudgetRemaining',
      name: i18n.translate('xpack.ux.dashboard.budgets.remainingLabel', {
        defaultMessage: 'Error budget',
      }),
      width: '110px',
      render: (remaining: number) => percent(remaining),
    },
    {
      name: i18n.translate('xpack.ux.dashboard.budgets.actionsLabel', {
        defaultMessage: 'Actions',
      }),
      width: '120px',
      render: (item: RumBudgetItem) => (
        <EuiButtonEmpty
          size="s"
          data-test-subj="uxDashboardBudgetInvestigate"
          onClick={() =>
            pushRumPath(history, '/session-replay', sessionsPatch(rumBudgetInvestigatePatch(item)))
          }
        >
          {i18n.translate('xpack.ux.budgets.investigateButtonLabel', {
            defaultMessage: 'Investigate',
          })}
        </EuiButtonEmpty>
      ),
    },
  ];

  if (loading) {
    return <PanelSpinner />;
  }
  if (!available || !canRead) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        title={i18n.translate('xpack.ux.dashboard.budgets.unavailableTitle', {
          defaultMessage: 'Budgets are not available',
        })}
      />
    );
  }
  if (error) {
    return <PanelError message={error} />;
  }
  if (items.length === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h3>
            {i18n.translate('xpack.ux.dashboard.budgets.emptyTitle', {
              defaultMessage: 'No performance budgets yet',
            })}
          </h3>
        }
        actions={
          <EuiButton
            size="s"
            data-test-subj="uxDashboardBudgetsOpen"
            onClick={() => pushRumPath(history, '/budgets')}
          >
            {i18n.translate('xpack.ux.dashboard.budgets.openButton', {
              defaultMessage: 'Open budgets',
            })}
          </EuiButton>
        }
      />
    );
  }

  return (
    <div data-test-subj="uxDashboardBudgets">
      <EuiFlexGroup responsive={false} gutterSize="l" wrap>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={String(items.length)}
            description={i18n.translate('xpack.ux.dashboard.budgets.totalStat', {
              defaultMessage: 'Budgets',
            })}
            titleSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={String(healthy)}
            description={i18n.translate('xpack.ux.dashboard.budgets.healthyStat', {
              defaultMessage: 'Healthy',
            })}
            titleSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={String(burning)}
            description={i18n.translate('xpack.ux.dashboard.budgets.burningStat', {
              defaultMessage: 'Burning',
            })}
            titleSize="s"
            titleColor={burning > 0 ? 'danger' : undefined}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.ux.dashboard.budgets.tableCaption', {
          defaultMessage: 'Performance budgets',
        })}
        items={items}
        columns={columns}
      />
    </div>
  );
}

function AlertsEmbeddable({ serviceName }: { serviceName?: string }) {
  const { http } = useKibanaServices();
  const history = useHistory();
  const [rules, setRules] = useState<RumAlertRuleSummary[]>([]);
  const [firingCount, setFiringCount] = useState(0);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const status = await fetchRumAlertStatus(http);
        if (cancelled) {
          return;
        }
        setAvailable(status.available);
        if (!status.available) {
          setRules([]);
          setFiringCount(0);
          return;
        }
        const result = await fetchRumAlerts(http);
        if (cancelled) {
          return;
        }
        const scoped = result.rules.filter((rule) => alertMatchesApp(rule, serviceName));
        const ids = new Set(scoped.map((rule) => rule.id));
        setRules(scoped);
        setFiringCount(
          result.episodes.filter(
            (episode) =>
              episode.ruleId && ids.has(episode.ruleId) && isRumAlertFireStatus(episode.status)
          ).length
        );
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setRules([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [http, serviceName]);

  const investigate = useCallback(
    (rule: RumAlertRuleSummary) => {
      const target = rumAlertInvestigateTarget(rule.templateId);
      const range = rule.lastFiredAt ? rumAlertEpisodeRange(rule.lastFiredAt) : undefined;
      const patch =
        target.pathname === '/session-replay'
          ? sessionsPatch({
              frustration: target.frustration,
              rangeFrom: range?.rangeFrom,
              rangeTo: range?.rangeTo,
            })
          : {
              frustration: target.frustration,
              rangeFrom: range?.rangeFrom,
              rangeTo: range?.rangeTo,
            };
      pushRumPath(history, target.pathname, patch);
    },
    [history]
  );

  const columns: Array<EuiBasicTableColumn<RumAlertRuleSummary>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.ux.dashboard.alerts.nameLabel', { defaultMessage: 'Name' }),
      render: (_name: string, rule: RumAlertRuleSummary) => (
        <EuiLink data-test-subj={`uxDashboardAlert-${rule.id}`} onClick={() => investigate(rule)}>
          {rule.name}
        </EuiLink>
      ),
    },
    {
      field: 'templateId',
      name: i18n.translate('xpack.ux.dashboard.alerts.templateLabel', {
        defaultMessage: 'Template',
      }),
      render: (templateId: RumAlertRuleSummary['templateId']) =>
        templateId ? rumAlertTemplateLabel(templateId) : '—',
    },
    {
      field: 'enabled',
      name: i18n.translate('xpack.ux.dashboard.alerts.statusLabel', { defaultMessage: 'Status' }),
      width: '100px',
      render: (enabled: boolean) => (
        <EuiHealth color={enabled ? 'success' : 'subdued'}>
          {enabled
            ? i18n.translate('xpack.ux.alerts.status.enabled', { defaultMessage: 'Enabled' })
            : i18n.translate('xpack.ux.alerts.status.disabled', { defaultMessage: 'Disabled' })}
        </EuiHealth>
      ),
    },
    {
      field: 'lastFiredAt',
      name: i18n.translate('xpack.ux.dashboard.alerts.lastFireLabel', {
        defaultMessage: 'Last fire',
      }),
      width: '120px',
      render: (lastFiredAt: string | undefined) =>
        lastFiredAt && Number.isFinite(Date.parse(lastFiredAt)) ? (
          <FormattedRelative value={new Date(lastFiredAt)} />
        ) : (
          <span>—</span>
        ),
    },
  ];

  if (loading) {
    return <PanelSpinner />;
  }
  if (!available) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="warning"
        title={i18n.translate('xpack.ux.dashboard.alerts.unavailableTitle', {
          defaultMessage: 'Alerting is not available',
        })}
      />
    );
  }
  if (error) {
    return <PanelError message={error} />;
  }
  if (rules.length === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h3>
            {i18n.translate('xpack.ux.dashboard.alerts.emptyTitle', {
              defaultMessage: 'No RUM alerts yet',
            })}
          </h3>
        }
        actions={
          <EuiButton
            size="s"
            data-test-subj="uxDashboardAlertsOpen"
            onClick={() => pushRumPath(history, '/alerts')}
          >
            {i18n.translate('xpack.ux.dashboard.alerts.openButton', {
              defaultMessage: 'Open alerts',
            })}
          </EuiButton>
        }
      />
    );
  }

  const enabledCount = rules.filter((rule) => rule.enabled).length;

  return (
    <div data-test-subj="uxDashboardAlerts">
      <EuiFlexGroup responsive={false} gutterSize="l" wrap>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={`${enabledCount}/${rules.length}`}
            description={i18n.translate('xpack.ux.dashboard.alerts.enabledStat', {
              defaultMessage: 'Enabled',
            })}
            titleSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={String(firingCount)}
            description={i18n.translate('xpack.ux.dashboard.alerts.firingStat', {
              defaultMessage: 'Firing now',
            })}
            titleSize="s"
            titleColor={firingCount > 0 ? 'danger' : undefined}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.ux.dashboard.alerts.tableCaption', {
          defaultMessage: 'RUM alerts',
        })}
        items={rules}
        columns={columns}
      />
    </div>
  );
}
