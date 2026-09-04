/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
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
} from '../../../../common/rum_app';
import { emptyRumAppSettings, type RumAppSettings } from '../../../../common/rum_app_settings';
import {
  rumGithubLinksForError,
  type RumGithubLinks as RumGithubLinkSet,
} from '../../../../common/rum_repository_links';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumAppSettings, fetchRumErrors } from '../../../services/rest/rum_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { uxFlyoutProps, type UxFlyoutSession } from '../../flyout/ux_flyout_props';
import { formatRelativeTime, formatTime, shortenPath } from '../../session_replay/session_ui';
import { TraceWaterfallFlyout, type TraceFlyoutTarget } from '../../trace/trace_waterfall_flyout';
import { useRumAlertFlyout } from '../rum_alerts/alert_flyout_context';
import { useRumPageLoading } from '../rum_dashboard/rum_page_loading';
import { RumGithubLinks } from '../rum_settings/rum_github_links';
import { ErrorsOverTimeChart } from './errors_over_time_chart';
import { ErrorPatternBadge, SharedFailureBadge } from './error_pattern_badge';

type ErrorSortField = 'count' | 'sessionCount' | 'userCount' | 'firstSeen' | 'lastSeen';

export const MiniTrend = ({ values }: { values: number[] }) => {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(1, ...values);
  return (
    <div
      css={css`
        display: flex;
        align-items: flex-end;
        gap: 1px;
        height: 24px;
        width: 72px;
      `}
      aria-label={i18n.translate('xpack.ux.errors.table.trendAriaLabel', {
        defaultMessage: 'Occurrences over time',
      })}
    >
      {values.map((value, index) => (
        <div
          key={index}
          css={css`
            flex: 1;
            height: ${Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 24))}px;
            background: ${euiTheme.colors.danger};
            border-radius: 1px;
          `}
        />
      ))}
    </div>
  );
};

const percent = (part: number, total: number): string =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';

const SeenCell = ({ value }: { value: string | null }) => (
  <EuiToolTip content={formatTime(value)}>
    <EuiText size="xs" tabIndex={0}>
      {formatRelativeTime(value)}
    </EuiText>
  </EuiToolTip>
);

const ErrorsKpiStrip = ({ kpis }: { kpis: RumErrorsKpis }) => {
  const items: Array<{ title: string; description: string }> = [
    {
      title: String(kpis.errorEvents),
      description: i18n.translate('xpack.ux.errors.kpi.eventsLabel', {
        defaultMessage: 'Error events',
      }),
    },
    {
      title: percent(kpis.impactedSessions, kpis.totalSessions),
      description: i18n.translate('xpack.ux.errors.kpi.impactedSessionsLabel', {
        defaultMessage: 'Impacted sessions',
      }),
    },
    {
      title: String(kpis.impactedUsers),
      description: i18n.translate('xpack.ux.errors.kpi.impactedUsersLabel', {
        defaultMessage: 'Impacted users',
      }),
    },
    {
      title: String(kpis.newGroups),
      description: i18n.translate('xpack.ux.errors.kpi.newIssuesLabel', {
        defaultMessage: 'New issues',
      }),
    },
  ];

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj="uxRumErrorsKpis">
      <EuiFlexGroup responsive={false} gutterSize="l" wrap>
        {items.map((item) => (
          <EuiFlexItem grow={false} key={item.description}>
            <EuiStat
              title={item.title}
              description={item.description}
              titleSize="s"
              textAlign="left"
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const ErrorDetailFlyout = ({
  group,
  apmHref,
  traceHref,
  githubLinks,
  onAddRepository,
  onClose,
  onViewSessions,
  onWatchReplay,
  onOpenPage,
  onViewTrace,
  onOpenApp,
  children,
  session = 'start',
}: {
  group: RumErrorGroup;
  apmHref: string | null;
  traceHref: string | null;
  githubLinks: RumGithubLinkSet;
  onAddRepository?: () => void;
  onClose: () => void;
  onViewSessions: () => void;
  onWatchReplay: () => void;
  onOpenPage: (path: string) => void;
  onViewTrace?: (target: TraceFlyoutTarget) => void;
  onOpenApp?: (serviceName: string) => void;
  children?: React.ReactNode;
  session?: UxFlyoutSession;
}) => (
  <EuiFlyout
    {...uxFlyoutProps({ title: group.type, session })}
    onClose={onClose}
    aria-labelledby="uxErrorDetailTitle"
    data-test-subj="uxErrorDetailFlyout"
  >
    <EuiFlyoutHeader hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2 id="uxErrorDetailTitle">{group.type}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ErrorPatternBadge pattern={group.pattern} />
        </EuiFlexItem>
        {group.affectedApps.length > 1 && (
          <EuiFlexItem grow={false}>
            <SharedFailureBadge />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="s" color="subdued">
        {group.message}
      </EuiText>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiText size="s">
        {i18n.translate('xpack.ux.errors.detail.counts', {
          defaultMessage: '{count} events in {sessions} sessions ({users} users)',
          values: { count: group.count, sessions: group.sessionCount, users: group.userCount },
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ux.errors.detail.firstSeenLabel', {
              defaultMessage: 'First seen',
            })}
          </EuiText>
          <SeenCell value={group.firstSeen} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ux.errors.detail.lastSeenLabel', {
              defaultMessage: 'Last seen',
            })}
          </EuiText>
          <SeenCell value={group.lastSeen} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {group.trend.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <MiniTrend values={group.trend} />
        </>
      )}
      {group.affectedPages.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ux.errors.detail.pagesLabel', {
              defaultMessage: 'Affected pages',
            })}
          </EuiText>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {group.affectedPages.map((page) => (
              <EuiFlexItem grow={false} key={page.path}>
                <EuiBadge
                  onClick={() => onOpenPage(page.path)}
                  onClickAriaLabel={i18n.translate('xpack.ux.errors.detail.pageAriaLabel', {
                    defaultMessage: 'Open {path} on the Pages tab',
                    values: { path: page.path },
                  })}
                >
                  {shortenPath(page.path, 28)}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
      {group.affectedApps.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ux.errors.detail.appsLabel', {
              defaultMessage: 'Affected applications',
            })}
          </EuiText>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {group.affectedApps.map((app) => (
              <EuiFlexItem grow={false} key={app.name}>
                {onOpenApp ? (
                  <EuiBadge
                    onClick={() => onOpenApp(app.name)}
                    onClickAriaLabel={i18n.translate('xpack.ux.errors.detail.appAriaLabel', {
                      defaultMessage: 'Open errors for {name}',
                      values: { name: app.name },
                    })}
                  >
                    {app.name} · {app.count}
                  </EuiBadge>
                ) : (
                  <EuiBadge>
                    {app.name} · {app.count}
                  </EuiBadge>
                )}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
      {(group.sampleAction || group.samplePage) && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {group.sampleAction && group.samplePage
              ? i18n.translate('xpack.ux.errors.detail.context', {
                  defaultMessage: 'During {action} on {page}',
                  values: { action: group.sampleAction, page: group.samplePage },
                })
              : group.samplePage
              ? i18n.translate('xpack.ux.errors.detail.contextPage', {
                  defaultMessage: 'On {page}',
                  values: { page: group.samplePage },
                })
              : i18n.translate('xpack.ux.errors.detail.contextAction', {
                  defaultMessage: 'During {action}',
                  values: { action: group.sampleAction ?? '' },
                })}
          </EuiText>
        </>
      )}
      <EuiSpacer />
      {group.sampleStack && (
        <EuiCodeBlock language="text" isCopyable overflowHeight={280}>
          {group.sampleStack}
        </EuiCodeBlock>
      )}
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="uxRumErrorsPanelWatchReplayButton"
            fill
            onClick={onWatchReplay}
          >
            {i18n.translate('xpack.ux.errors.watchReplayButtonLabel', {
              defaultMessage: 'Watch replay',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton data-test-subj="uxRumErrorsPanelViewSessionsButton" onClick={onViewSessions}>
            {i18n.translate('xpack.ux.errors.detail.sessions', {
              defaultMessage: 'View sessions',
            })}
          </EuiButton>
        </EuiFlexItem>
        {apmHref && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uxRumErrorsPanelOpenInApmButton"
              href={apmHref}
              target="_blank"
            >
              {i18n.translate('xpack.ux.errors.detail.apm', {
                defaultMessage: 'Open in APM',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
        {group.sampleTraceId && onViewTrace && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uxRumErrorsPanelViewTraceButton"
              onClick={() =>
                onViewTrace({
                  traceId: group.sampleTraceId as string,
                  timestamp: group.lastSeen,
                  title: group.type,
                })
              }
            >
              {i18n.translate('xpack.ux.errors.detail.viewTrace', {
                defaultMessage: 'View backend trace',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
        {traceHref && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uxRumErrorsPanelOpenTraceButton"
              href={traceHref}
              target="_blank"
            >
              {i18n.translate('xpack.ux.errors.detail.trace', {
                defaultMessage: 'Open trace',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer />
      <RumGithubLinks links={githubLinks} onAddRepository={onAddRepository} />
    </EuiFlyoutBody>
    {children}
  </EuiFlyout>
);

export function RumErrorsPanel() {
  const { http } = useKibanaServices();
  const history = useHistory();
  const { open: openAlert } = useRumAlertFlyout();
  const {
    rangeId,
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      browser,
      os,
      pageUrl,
      user,
      includeBots,
      botUa,
      kuery,
      breakpoint,
      connection,
      device,
    },
  } = useLegacyUrlParams();

  const [groups, setGroups] = useState<RumErrorGroup[]>([]);
  const [kpis, setKpis] = useState<RumErrorsKpis>(emptyErrorsKpis());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<RumAppSettings>(() =>
    emptyRumAppSettings(serviceName ?? '')
  );
  useRumPageLoading('errors', loading);
  const [selected, setSelected] = useState<RumErrorGroup | null>(null);
  const [traceTarget, setTraceTarget] = useState<TraceFlyoutTarget | null>(null);
  const [sortField, setSortField] = useState<ErrorSortField>('sessionCount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRumErrors({
        http,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        browser,
        os,
        pageUrl,
        user,
        includeBots,
        botUa,
        kuery,
        breakpoint,
        connection,
        device,
      });
      setGroups(result.groups);
      setKpis(result.kpis ?? emptyErrorsKpis());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGroups([]);
      setKpis(emptyErrorsKpis());
    } finally {
      setLoading(false);
    }
  }, [
    http,
    rangeFrom,
    rangeTo,
    serviceName,
    browser,
    os,
    pageUrl,
    user,
    includeBots,
    botUa,
    kuery,
    breakpoint,
    connection,
    device,
  ]);

  useEffect(() => {
    void load();
  }, [load, rangeId]);

  useEffect(() => {
    if (!serviceName) {
      setSettings(emptyRumAppSettings(''));
      return;
    }
    let cancelled = false;
    fetchRumAppSettings({ http, serviceName })
      .then((result) => {
        if (!cancelled) {
          setSettings(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettings(emptyRumAppSettings(serviceName));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [http, serviceName]);

  const sortedGroups = useMemo(() => {
    const copy = [...groups];
    copy.sort((left, right) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'firstSeen' || sortField === 'lastSeen') {
        const leftMs = left[sortField] ? Date.parse(left[sortField] as string) : 0;
        const rightMs = right[sortField] ? Date.parse(right[sortField] as string) : 0;
        return (leftMs - rightMs) * direction;
      }
      return (left[sortField] - right[sortField]) * direction;
    });
    return copy;
  }, [groups, sortDirection, sortField]);

  const apmTraceHref = (group: RumErrorGroup): string | null => {
    if (!group.sampleTraceId) {
      return null;
    }
    return http.basePath.prepend(
      `/app/apm/link-to/trace/${encodeURIComponent(group.sampleTraceId)}`
    );
  };

  const apmErrorHref = (group: RumErrorGroup): string | null => {
    if (!serviceName || !group.groupingKey) {
      return null;
    }
    return http.basePath.prepend(
      `/app/apm/services/${encodeURIComponent(String(serviceName))}/errors/${encodeURIComponent(
        group.groupingKey
      )}`
    );
  };

  const openSessions = (item: RumErrorGroup, withReplay: boolean) =>
    pushRumPath(
      history,
      '/session-replay',
      sessionsPatch({
        errorGroup: item.key,
        sessionQuery: item.type ? `error:${item.type}` : '',
        pageUrl: pageUrl || '',
        hasReplay: withReplay ? 'true' : '',
      })
    );

  const columns: Array<EuiBasicTableColumn<RumErrorGroup>> = [
    {
      field: 'message',
      name: i18n.translate('xpack.ux.errors.table.error', { defaultMessage: 'Error' }),
      render: (_: string, item) => (
        <div>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="uxColumnsButton"
                flush="left"
                onClick={() => setSelected(item)}
              >
                {item.type}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {item.isNew && (
              <EuiFlexItem grow={false}>
                <ErrorPatternBadge pattern={item.pattern ?? 'new'} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued" className="eui-textTruncate">
            {item.message}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'count',
      name: i18n.translate('xpack.ux.errors.table.count', { defaultMessage: 'Events' }),
      width: '90px',
      sortable: true,
    },
    {
      field: 'sessionCount',
      name: i18n.translate('xpack.ux.errors.table.sessions', { defaultMessage: 'Sessions' }),
      width: '100px',
      sortable: true,
    },
    {
      field: 'userCount',
      name: i18n.translate('xpack.ux.errors.table.users', { defaultMessage: 'Affected users' }),
      width: '120px',
      sortable: true,
    },
    {
      field: 'firstSeen',
      name: i18n.translate('xpack.ux.errors.table.firstSeenLabel', {
        defaultMessage: 'First seen',
      }),
      width: '110px',
      sortable: true,
      render: (value: string | null) => <SeenCell value={value} />,
    },
    {
      field: 'lastSeen',
      name: i18n.translate('xpack.ux.errors.table.lastSeenLabel', { defaultMessage: 'Last seen' }),
      width: '110px',
      sortable: true,
      render: (value: string | null) => <SeenCell value={value} />,
    },
    {
      name: i18n.translate('xpack.ux.errors.table.pagesLabel', { defaultMessage: 'Pages' }),
      width: '160px',
      render: (item: RumErrorGroup) =>
        item.affectedPages.length === 0 ? (
          <EuiText size="xs" color="subdued">
            —
          </EuiText>
        ) : (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {item.affectedPages.map((page) => (
              <EuiFlexItem grow={false} key={page.path}>
                <EuiBadge
                  onClick={() => pushRumPath(history, '/pages', { pageUrl: page.path })}
                  onClickAriaLabel={i18n.translate('xpack.ux.errors.table.pageAriaLabel', {
                    defaultMessage: 'Open {path} on the Pages tab',
                    values: { path: page.path },
                  })}
                >
                  {shortenPath(page.path, 20)}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
    },
    {
      field: 'trend',
      name: i18n.translate('xpack.ux.errors.table.trend', { defaultMessage: 'Trend' }),
      width: '90px',
      render: (trend: number[]) => <MiniTrend values={trend} />,
    },
    {
      name: i18n.translate('xpack.ux.errors.table.actions', { defaultMessage: 'Actions' }),
      width: '240px',
      render: (item: RumErrorGroup) => {
        const apmHref = apmErrorHref(item);
        return (
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.ux.errors.watchReplayTooltip', {
                  defaultMessage: 'Open sessions with this error that have a replay',
                })}
              >
                <EuiButtonEmpty
                  data-test-subj="uxColumnsWatchReplayButton"
                  size="s"
                  iconType="play"
                  onClick={() => openSessions(item, true)}
                >
                  {i18n.translate('xpack.ux.errors.watchReplayButtonLabel', {
                    defaultMessage: 'Watch replay',
                  })}
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="uxColumnsAlertButton"
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
                {i18n.translate('xpack.ux.errors.alert', { defaultMessage: 'Alert' })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {item.sampleTraceId && (
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="uxColumnsViewTraceLink"
                  onClick={() =>
                    setTraceTarget({
                      traceId: item.sampleTraceId as string,
                      timestamp: item.lastSeen,
                      title: item.type,
                    })
                  }
                >
                  {i18n.translate('xpack.ux.errors.viewTrace', { defaultMessage: 'Trace' })}
                </EuiLink>
              </EuiFlexItem>
            )}
            {apmHref && (
              <EuiFlexItem grow={false}>
                <EuiLink data-test-subj="uxColumnsApmLink" href={apmHref} target="_blank">
                  {i18n.translate('xpack.ux.errors.apm', { defaultMessage: 'APM' })}
                </EuiLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
  ];

  return (
    <>
      <ErrorsKpiStrip kpis={kpis} />
      <EuiSpacer />
      <ErrorsOverTimeChart groups={groups} />
      <EuiSpacer />
      <EuiPanel paddingSize="m" data-test-subj="uxRumErrorsPanel">
        <EuiTitle size="xs">
          <h2>{i18n.translate('xpack.ux.errors.title', { defaultMessage: 'Errors' })}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.errors.description', {
              defaultMessage:
                'JavaScript exceptions grouped by type and message, ranked by impacted sessions. New means the group was not present at the start of this range.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />

        {error && (
          <>
            <EuiCallOut
              announceOnMount
              color="danger"
              title={i18n.translate('xpack.ux.errors.errorTitle', {
                defaultMessage: 'Unable to load errors',
              })}
            >
              <p>{error}</p>
              <EuiButton
                data-test-subj="uxRumErrorsPanelRetryButton"
                color="danger"
                onClick={() => void load()}
              >
                {i18n.translate('xpack.ux.errors.retry', { defaultMessage: 'Retry' })}
              </EuiButton>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {loading && groups.length === 0 ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.ux.errors.tableCaption', {
              defaultMessage: 'JavaScript error groups',
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
            noItemsMessage={i18n.translate('xpack.ux.errors.empty', {
              defaultMessage: 'No exceptions in this range',
            })}
          />
        )}

        {selected && (
          <ErrorDetailFlyout
            group={selected}
            apmHref={apmErrorHref(selected)}
            traceHref={apmTraceHref(selected)}
            githubLinks={rumGithubLinksForError(settings, selected, { rangeFrom, rangeTo })}
            onAddRepository={
              serviceName
                ? () => {
                    setSelected(null);
                    pushRumPath(history, '/settings');
                  }
                : undefined
            }
            onClose={() => {
              setTraceTarget(null);
              setSelected(null);
            }}
            onViewSessions={() => openSessions(selected, false)}
            onWatchReplay={() => openSessions(selected, true)}
            onOpenPage={(path) => pushRumPath(history, '/pages', { pageUrl: path })}
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
      </EuiPanel>
    </>
  );
}
