/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import {
  emptyErrorsKpis,
  type RumErrorGroup,
  type RumErrorsKpis,
  type RumFailingApp,
} from '../../../../common/rum_app';
import { emptyRumAppSettings } from '../../../../common/rum_app_settings';
import { rumGithubLinksForError } from '../../../../common/rum_repository_links';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumErrors } from '../../../services/rest/rum_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { formatRelativeTime } from '../../session_replay/session_ui';
import { UxInventoryChrome } from '../rum_apps/ux_inventory_chrome';
import { RumAlertFlyoutProvider, useRumAlertFlyout } from '../rum_alerts/alert_flyout_context';
import { RumKueryBar } from '../rum_filters/rum_kuery_bar';
import { ErrorDetailFlyout, MiniTrend } from '../rum_errors';
import { ErrorsOverTimeChart } from '../rum_errors/errors_over_time_chart';
import { ErrorPatternBadge, SharedFailureBadge } from '../rum_errors/error_pattern_badge';
import { TraceWaterfallFlyout, type TraceFlyoutTarget } from '../../trace/trace_waterfall_flyout';

type ErrorSortField = 'count' | 'sessionCount' | 'userCount' | 'lastSeen';
type GroupFilter = 'all' | 'new' | 'shared' | 'regressed' | 'improving';

const percent = (part: number, total: number): string =>
  total > 0 ? `${Math.round((part / total) * 1000) / 10}%` : '0%';

const formatDelta = (
  current: number,
  previous: number
): { text: string; worse: boolean } | null => {
  const abs = current - previous;
  if (abs === 0) {
    return null;
  }
  return {
    text: `${abs > 0 ? '+' : ''}${abs.toLocaleString()}`,
    worse: abs > 0,
  };
};

const primaryApp = (group: RumErrorGroup): string | undefined => group.affectedApps[0]?.name;

function KpiDelta({ current, previous }: { current: number; previous: number }) {
  const delta = formatDelta(current, previous);
  if (!delta) {
    return null;
  }
  return (
    <EuiText size="xs" color={delta.worse ? 'danger' : 'success'}>
      {delta.text}
    </EuiText>
  );
}

function GlobalErrorsKpis({ kpis }: { kpis: RumErrorsKpis }) {
  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="uxGlobalErrorsKpis">
      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem>
          <EuiStat
            title={kpis.errorEvents.toLocaleString()}
            description={i18n.translate('xpack.ux.globalErrors.eventsStatLabel', {
              defaultMessage: 'Error events',
            })}
            titleSize="s"
            titleColor={kpis.errorEvents > 0 ? 'danger' : undefined}
          />
          <KpiDelta current={kpis.errorEvents} previous={kpis.previousErrorEvents} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={percent(kpis.impactedSessions, kpis.totalSessions)}
            description={i18n.translate('xpack.ux.globalErrors.impactedSessionsStatLabel', {
              defaultMessage: 'Impacted sessions',
            })}
            titleSize="s"
          />
          <KpiDelta current={kpis.impactedSessions} previous={kpis.previousImpactedSessions} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={
              kpis.totalApps > 0
                ? i18n.translate('xpack.ux.globalErrors.affectedAppsStatTitle', {
                    defaultMessage: '{affected} / {total}',
                    values: { affected: kpis.affectedApps, total: kpis.totalApps },
                  })
                : String(kpis.affectedApps)
            }
            description={i18n.translate('xpack.ux.globalErrors.affectedAppsStatLabel', {
              defaultMessage: 'Apps affected',
            })}
            titleSize="s"
            titleColor={kpis.affectedApps > 0 ? 'warning' : undefined}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={String(kpis.newGroups)}
            description={i18n.translate('xpack.ux.globalErrors.newIssuesStatLabel', {
              defaultMessage: 'New issues',
            })}
            titleSize="s"
            titleColor={kpis.newGroups > 0 ? 'accent' : undefined}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={String(kpis.sharedGroups)}
            description={i18n.translate('xpack.ux.globalErrors.sharedStatLabel', {
              defaultMessage: 'Shared failures',
            })}
            titleSize="s"
            titleColor={kpis.sharedGroups > 0 ? 'danger' : undefined}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function FailingAppsPanel({
  apps,
  onOpenApp,
}: {
  apps: RumFailingApp[];
  onOpenApp: (name: string) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const maxEvents = Math.max(1, ...apps.map((app) => app.errorEvents));

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj="uxGlobalErrorsFailingApps"
      style={{ height: '100%' }}
    >
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.ux.globalErrors.failingAppsTitle', {
            defaultMessage: 'Hottest apps',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.ux.globalErrors.failingAppsDescription', {
          defaultMessage: 'Where exceptions concentrate. Open an app to debug in place.',
        })}
      </EuiText>
      <EuiSpacer size="m" />
      {apps.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.ux.globalErrors.failingAppsEmptyDescription', {
            defaultMessage: 'No applications reported exceptions in this range.',
          })}
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="m">
          {apps.slice(0, 8).map((app, index) => (
            <EuiFlexItem key={app.name} grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {index + 1}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiLink
                    data-test-subj={`uxGlobalErrorsApp-${app.name}`}
                    onClick={() => onOpenApp(app.name)}
                  >
                    {app.name}
                  </EuiLink>
                  <EuiProgress
                    value={app.errorEvents}
                    max={maxEvents}
                    size="s"
                    color="danger"
                    css={css`
                      margin-top: ${euiTheme.size.xs};
                    `}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    {i18n.translate('xpack.ux.globalErrors.failingAppsEventsLabel', {
                      defaultMessage: '{count} events',
                      values: { count: app.errorEvents.toLocaleString() },
                    })}
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {percent(app.impactedSessions, app.totalSessions)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
}

function GlobalErrorsBody() {
  const { http } = useKibanaServices();
  const history = useHistory();
  const { open: openAlert } = useRumAlertFlyout();
  const {
    rangeId,
    urlParams: { rangeFrom = 'now-24h', rangeTo = 'now', includeBots, botUa, kuery },
  } = useLegacyUrlParams();

  const [groups, setGroups] = useState<RumErrorGroup[]>([]);
  const [kpis, setKpis] = useState<RumErrorsKpis>(emptyErrorsKpis());
  const [failingApps, setFailingApps] = useState<RumFailingApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RumErrorGroup | null>(null);
  const [traceTarget, setTraceTarget] = useState<TraceFlyoutTarget | null>(null);
  const [sortField, setSortField] = useState<ErrorSortField>('sessionCount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRumErrors({
        http,
        rangeFrom,
        rangeTo,
        includeBots: typeof includeBots === 'string' ? includeBots : undefined,
        botUa: typeof botUa === 'string' ? botUa : undefined,
        kuery,
      });
      setGroups(result.groups);
      setKpis(result.kpis ?? emptyErrorsKpis());
      setFailingApps(result.topFailingApps ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGroups([]);
      setKpis(emptyErrorsKpis());
      setFailingApps([]);
    } finally {
      setLoading(false);
    }
  }, [http, rangeFrom, rangeTo, includeBots, botUa, kuery]);

  useEffect(() => {
    void load();
  }, [load, rangeId]);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      if (groupFilter === 'new') {
        return group.pattern === 'new';
      }
      if (groupFilter === 'shared') {
        return group.affectedApps.length > 1;
      }
      if (groupFilter === 'regressed' || groupFilter === 'improving') {
        return group.pattern === groupFilter;
      }
      return true;
    });
  }, [groupFilter, groups]);

  const sortedGroups = useMemo(() => {
    const copy = [...filteredGroups];
    copy.sort((left, right) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'lastSeen') {
        const leftMs = left.lastSeen ? Date.parse(left.lastSeen) : 0;
        const rightMs = right.lastSeen ? Date.parse(right.lastSeen) : 0;
        return (leftMs - rightMs) * direction;
      }
      return (left[sortField] - right[sortField]) * direction;
    });
    return copy;
  }, [filteredGroups, sortDirection, sortField]);

  const openAppErrors = useCallback(
    (serviceName: string) => {
      pushRumPath(history, '/errors', { serviceName });
    },
    [history]
  );

  const openSessions = (item: RumErrorGroup, withReplay: boolean) => {
    const serviceName = primaryApp(item);
    if (!serviceName) {
      return;
    }
    pushRumPath(
      history,
      '/session-replay',
      sessionsPatch({
        serviceName,
        errorGroup: item.key,
        sessionQuery: item.type ? `error:${item.type}` : '',
        hasReplay: withReplay ? 'true' : '',
      })
    );
  };

  const filterCount = (id: GroupFilter): number => {
    if (id === 'all') {
      return groups.length;
    }
    if (id === 'shared') {
      return groups.filter((group) => group.affectedApps.length > 1).length;
    }
    return groups.filter((group) => group.pattern === id).length;
  };

  const columns: Array<EuiBasicTableColumn<RumErrorGroup>> = [
    {
      field: 'message',
      name: i18n.translate('xpack.ux.globalErrors.table.errorLabel', { defaultMessage: 'Error' }),
      render: (_: string, item) => (
        <div>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="uxGlobalErrorsOpenGroupButton"
                flush="left"
                onClick={() => setSelected(item)}
              >
                {item.type}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ErrorPatternBadge pattern={item.pattern} />
            </EuiFlexItem>
            {item.affectedApps.length > 1 ? (
              <EuiFlexItem grow={false}>
                <SharedFailureBadge />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued" className="eui-textTruncate">
            {item.message}
          </EuiText>
        </div>
      ),
    },
    {
      name: i18n.translate('xpack.ux.globalErrors.table.appsLabel', { defaultMessage: 'Apps' }),
      width: '180px',
      render: (item: RumErrorGroup) =>
        item.affectedApps.length === 0 ? (
          <EuiText size="xs" color="subdued">
            —
          </EuiText>
        ) : (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {item.affectedApps.slice(0, 3).map((app) => (
              <EuiFlexItem grow={false} key={app.name}>
                <EuiLink
                  data-test-subj={`uxGlobalErrorsGroupApp-${app.name}`}
                  onClick={() => openAppErrors(app.name)}
                >
                  {app.name}
                </EuiLink>
              </EuiFlexItem>
            ))}
            {item.affectedApps.length > 3 ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  +{item.affectedApps.length - 3}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
    },
    {
      field: 'count',
      name: i18n.translate('xpack.ux.globalErrors.table.eventsLabel', { defaultMessage: 'Events' }),
      width: '90px',
      sortable: true,
    },
    {
      field: 'sessionCount',
      name: i18n.translate('xpack.ux.globalErrors.table.sessionsLabel', {
        defaultMessage: 'Sessions',
      }),
      width: '100px',
      sortable: true,
    },
    {
      field: 'lastSeen',
      name: i18n.translate('xpack.ux.globalErrors.table.lastSeenLabel', {
        defaultMessage: 'Last seen',
      }),
      width: '110px',
      sortable: true,
      render: (value: string | null) => (
        <EuiToolTip content={value ?? ''}>
          <EuiText size="xs" tabIndex={0}>
            {formatRelativeTime(value)}
          </EuiText>
        </EuiToolTip>
      ),
    },
    {
      field: 'trend',
      name: i18n.translate('xpack.ux.globalErrors.table.trendLabel', { defaultMessage: 'Trend' }),
      width: '90px',
      render: (trend: number[]) => <MiniTrend values={trend} />,
    },
    {
      name: i18n.translate('xpack.ux.globalErrors.table.actionsLabel', {
        defaultMessage: 'Actions',
      }),
      width: '220px',
      render: (item: RumErrorGroup) => {
        const appName = primaryApp(item);
        return (
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.ux.globalErrors.watchReplayTooltip', {
                  defaultMessage: 'Open sessions with this error that have a replay',
                })}
              >
                <EuiButtonEmpty
                  data-test-subj="uxGlobalErrorsWatchReplayButton"
                  size="s"
                  iconType="play"
                  disabled={!appName}
                  onClick={() => openSessions(item, true)}
                >
                  {i18n.translate('xpack.ux.globalErrors.watchReplayButtonLabel', {
                    defaultMessage: 'Watch replay',
                  })}
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
            {appName ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="uxGlobalErrorsViewInAppButton"
                  size="s"
                  onClick={() => openAppErrors(appName)}
                >
                  {i18n.translate('xpack.ux.globalErrors.viewInAppButtonLabel', {
                    defaultMessage: 'View in app',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="uxGlobalErrorsAlertButton"
                size="s"
                onClick={() =>
                  openAlert({
                    templateId: 'error_spike',
                    errorType: item.type,
                    errorMessage: item.message.split('\n')[0],
                    threshold: Math.max(5, item.count),
                  })
                }
              >
                {i18n.translate('xpack.ux.globalErrors.alertButtonLabel', {
                  defaultMessage: 'Alert',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
  ];

  const filters: Array<{ id: GroupFilter; label: string }> = [
    {
      id: 'all',
      label: i18n.translate('xpack.ux.globalErrors.filter.allLabel', { defaultMessage: 'All' }),
    },
    {
      id: 'new',
      label: i18n.translate('xpack.ux.globalErrors.filter.newLabel', { defaultMessage: 'New' }),
    },
    {
      id: 'shared',
      label: i18n.translate('xpack.ux.globalErrors.filter.sharedLabel', {
        defaultMessage: 'Shared',
      }),
    },
    {
      id: 'regressed',
      label: i18n.translate('xpack.ux.globalErrors.filter.backLabel', { defaultMessage: 'Back' }),
    },
    {
      id: 'improving',
      label: i18n.translate('xpack.ux.globalErrors.filter.coolingLabel', {
        defaultMessage: 'Cooling',
      }),
    },
  ];

  return (
    <div data-test-subj="uxGlobalErrorsPage" style={{ position: 'relative' }}>
      {loading && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          data-test-subj="uxGlobalErrorsLoading"
          aria-label={i18n.translate('xpack.ux.globalErrors.loadingAriaLabel', {
            defaultMessage: 'Loading errors',
          })}
        />
      )}
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.ux.globalErrors.pageDescription', {
            defaultMessage:
              'JavaScript exceptions across every application. Shared failures usually mean a common bundle, tag manager, or CDN — not an app-specific bug.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <RumKueryBar />
      <EuiSpacer />

      {error ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          title={i18n.translate('xpack.ux.globalErrors.loadErrorTitle', {
            defaultMessage: 'Unable to load errors',
          })}
        >
          <p>{error}</p>
          <EuiButton
            data-test-subj="uxGlobalErrorsRetryButton"
            color="danger"
            onClick={() => void load()}
          >
            {i18n.translate('xpack.ux.globalErrors.retryButtonLabel', { defaultMessage: 'Retry' })}
          </EuiButton>
        </EuiCallOut>
      ) : loading && groups.length === 0 ? (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 240 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <>
          <GlobalErrorsKpis kpis={kpis} />
          <EuiSpacer />
          {kpis.sharedGroups > 0 ? (
            <>
              <EuiCallOut
                announceOnMount
                color="warning"
                iconType="aggregate"
                title={i18n.translate('xpack.ux.globalErrors.sharedCalloutTitle', {
                  defaultMessage:
                    '{count, plural, one {# error spans multiple apps} other {# errors span multiple apps}}',
                  values: { count: kpis.sharedGroups },
                })}
              >
                <p>
                  {i18n.translate('xpack.ux.globalErrors.sharedCalloutDescription', {
                    defaultMessage:
                      'Filter to Shared and jump into a replay. Fixing the common dependency often clears several applications at once.',
                  })}
                </p>
              </EuiCallOut>
              <EuiSpacer />
            </>
          ) : null}
          <EuiFlexGroup>
            <EuiFlexItem grow={7}>
              <ErrorsOverTimeChart groups={groups} />
            </EuiFlexItem>
            <EuiFlexItem grow={5}>
              <FailingAppsPanel apps={failingApps} onOpenApp={openAppErrors} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiPanel hasBorder paddingSize="m" data-test-subj="uxGlobalErrorsTablePanel">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate('xpack.ux.globalErrors.groupsTitle', {
                      defaultMessage: 'Error groups',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  {filters.map((filter) => (
                    <EuiFilterButton
                      key={filter.id}
                      hasActiveFilters={groupFilter === filter.id}
                      numFilters={filterCount(filter.id)}
                      onClick={() => setGroupFilter(filter.id)}
                      data-test-subj={`uxGlobalErrorsFilter-${filter.id}`}
                    >
                      {filter.label}
                    </EuiFilterButton>
                  ))}
                </EuiFilterGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            {sortedGroups.length === 0 && !loading ? (
              <EuiEmptyPrompt
                iconType="checkCircleFill"
                title={
                  <h3>
                    {groups.length === 0
                      ? i18n.translate('xpack.ux.globalErrors.emptyTitle', {
                          defaultMessage: 'Quiet fleet',
                        })
                      : i18n.translate('xpack.ux.globalErrors.filterEmptyTitle', {
                          defaultMessage: 'Nothing in this filter',
                        })}
                  </h3>
                }
                body={
                  <p>
                    {groups.length === 0
                      ? i18n.translate('xpack.ux.globalErrors.emptyDescription', {
                          defaultMessage:
                            'No JavaScript exceptions in this range. Widen the window, or capture traffic with EDOT Browser.',
                        })
                      : i18n.translate('xpack.ux.globalErrors.filterEmptyDescription', {
                          defaultMessage: 'Try All, or pick a different pattern.',
                        })}
                  </p>
                }
              />
            ) : (
              <EuiBasicTable
                tableCaption={i18n.translate('xpack.ux.globalErrors.tableCaption', {
                  defaultMessage: 'Error groups across applications',
                })}
                items={sortedGroups}
                columns={columns}
                loading={loading}
                sorting={{
                  sort: { field: sortField, direction: sortDirection },
                }}
                onChange={({ sort }: Criteria<RumErrorGroup>) => {
                  if (sort?.field) {
                    setSortField(sort.field as ErrorSortField);
                    setSortDirection(sort.direction);
                  }
                }}
              />
            )}
          </EuiPanel>
        </>
      )}

      {selected && (
        <ErrorDetailFlyout
          group={selected}
          apmHref={null}
          traceHref={
            selected.sampleTraceId
              ? http.basePath.prepend(
                  `/app/apm/link-to/trace/${encodeURIComponent(selected.sampleTraceId)}`
                )
              : null
          }
          githubLinks={rumGithubLinksForError(
            emptyRumAppSettings(primaryApp(selected) ?? ''),
            selected,
            {
              rangeFrom,
              rangeTo,
            }
          )}
          onClose={() => {
            setTraceTarget(null);
            setSelected(null);
          }}
          onViewSessions={() => openSessions(selected, false)}
          onWatchReplay={() => openSessions(selected, true)}
          onOpenPage={(path) =>
            pushRumPath(history, '/pages', {
              pageUrl: path,
              serviceName: primaryApp(selected) ?? '',
            })
          }
          onOpenApp={openAppErrors}
          onViewTrace={setTraceTarget}
        >
          {traceTarget && (
            <TraceWaterfallFlyout
              session="inherit"
              target={traceTarget}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              onClose={() => setTraceTarget(null)}
            />
          )}
        </ErrorDetailFlyout>
      )}
    </div>
  );
}

export function RumGlobalErrorsPage() {
  return (
    <RumAlertFlyoutProvider>
      <UxInventoryChrome tab="errors" isPageDataLoaded={true}>
        <GlobalErrorsBody />
      </UxInventoryChrome>
    </RumAlertFlyoutProvider>
  );
}
