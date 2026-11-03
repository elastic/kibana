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
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { userGroupKey } from '../../../common/rum_report';
import {
  bounceRate,
  type RumSessionSummary,
  type SessionListFacets,
  type SessionListStats,
  type SessionSortDirection,
  type SessionSortField,
} from '../../../common/session_replay';
import { useLegacyUrlParams } from '../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchSessionReplaySessions } from '../../services/rest/session_replay_api';
import { mergeRumSearch, pushRumPath } from '../../utils/rum_search';
import { TabTrendChart } from '../app/rum_overview/tab_trend_chart';
import { useRumPageLoading } from '../app/rum_dashboard/rum_page_loading';
import { UX_SESSION_REPLAY_ROW_PREFIX } from '../app/rum_tour/tour_steps';
import { UxTourAnchor } from '../app/rum_tour/ux_tour_anchor';
import { UxTourReplayState } from '../app/rum_tour/ux_tour_context';
import { LiveSessionsPanel } from './live_sessions_panel';
import {
  JourneyTrail,
  SignalBadges,
  Sparkline,
  UserCell,
  formatDurationMs,
  formatRelativeTime,
  formatTime,
} from './session_ui';

const EMPTY_FACETS: SessionListFacets = {
  browsers: [],
  os: [],
  countries: [],
  users: [],
  hasReplay: 0,
  hasErrors: 0,
  hasRage: 0,
  hasBounced: 0,
};

const EMPTY_STATS: SessionListStats = {
  total: 0,
  withReplay: 0,
  withErrors: 0,
  rageClicks: 0,
  medianDurationMs: 0,
  bounced: 0,
  viewed: 0,
};

interface DurationOption {
  key: string;
  label: string;
  min?: number;
  max?: number;
}

const DURATION_OPTIONS: DurationOption[] = [
  {
    key: 'any',
    label: i18n.translate('xpack.ux.sessions.duration.any', { defaultMessage: 'Any' }),
  },
  {
    key: 'lt5',
    label: i18n.translate('xpack.ux.sessions.duration.lt5', { defaultMessage: '< 5s' }),
    max: 5000,
  },
  {
    key: '5to30',
    label: i18n.translate('xpack.ux.sessions.duration.5to30', { defaultMessage: '5 – 30s' }),
    min: 5000,
    max: 30000,
  },
  {
    key: '30to60',
    label: i18n.translate('xpack.ux.sessions.duration.30to60', { defaultMessage: '30 – 60s' }),
    min: 30000,
    max: 60000,
  },
  {
    key: 'gt60',
    label: i18n.translate('xpack.ux.sessions.duration.gt60', { defaultMessage: '> 60s' }),
    min: 60000,
  },
];

const HeaderWithTip = ({ label, tip }: { label: string; tip: string }) => (
  <EuiToolTip content={tip}>
    <span tabIndex={0}>
      {label} <EuiIcon type="question" size="s" color="subdued" aria-hidden={true} />
    </span>
  </EuiToolTip>
);

interface FacetOption {
  key: string;
  label?: string;
  count?: number;
}

/** Single-select facet as a filter button + popover, optionally showing per-value counts. */
const FacetSelect = ({
  label,
  options: facetOptions,
  value,
  onChange,
  searchable = false,
}: {
  label: string;
  options: FacetOption[];
  value?: string;
  onChange: (next?: string) => void;
  searchable?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const options: EuiSelectableOption[] = facetOptions.map((option) => ({
    label: `${option.label ?? option.key}${option.count != null ? ` (${option.count})` : ''}`,
    key: option.key,
    checked: value === option.key ? 'on' : undefined,
  }));
  const selectedLabel = facetOptions.find((option) => option.key === value)?.label ?? value;

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.ux.sessions.filter.facetAria', {
        defaultMessage: 'Filter by {label}',
        values: { label },
      })}
      panelPaddingSize="none"
      isOpen={open}
      closePopover={() => setOpen(false)}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          isSelected={open}
          onClick={() => setOpen((v) => !v)}
          hasActiveFilters={Boolean(value)}
          numActiveFilters={value ? 1 : undefined}
          isDisabled={facetOptions.length === 0}
          grow={false}
        >
          {selectedLabel ?? label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        singleSelection
        searchable={searchable}
        options={options}
        onChange={(next) => {
          const selected = next.find((option) => option.checked === 'on');
          onChange(selected?.key);
          setOpen(false);
        }}
      >
        {(list, search) => (
          <div style={{ width: 260 }}>
            {search}
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

const KpiStrip = ({ stats }: { stats: SessionListStats }) => {
  const replayPct = stats.total > 0 ? Math.round((stats.withReplay / stats.total) * 100) : 0;
  const errorPct = stats.total > 0 ? Math.round((stats.withErrors / stats.total) * 100) : 0;
  const bouncePct = bounceRate(stats.bounced, stats.viewed);

  const items: Array<{ title: string; description: string }> = [
    {
      title: String(stats.total),
      description: i18n.translate('xpack.ux.sessions.kpi.total', { defaultMessage: 'Sessions' }),
    },
    {
      title: `${replayPct}%`,
      description: i18n.translate('xpack.ux.sessions.kpi.replay', {
        defaultMessage: 'With replay',
      }),
    },
    {
      title: `${errorPct}%`,
      description: i18n.translate('xpack.ux.sessions.kpi.errors', {
        defaultMessage: 'With errors',
      }),
    },
    {
      title: bouncePct == null ? '—' : `${Math.round(bouncePct * 1000) / 10}%`,
      description: i18n.translate('xpack.ux.sessions.kpi.bounce', {
        defaultMessage: 'Bounce rate',
      }),
    },
    {
      title: String(stats.rageClicks),
      description: i18n.translate('xpack.ux.sessions.kpi.rage', {
        defaultMessage: 'Rage clicks',
      }),
    },
    {
      title: formatDurationMs(stats.medianDurationMs),
      description: i18n.translate('xpack.ux.sessions.kpi.median', {
        defaultMessage: 'Median duration',
      }),
    },
  ];

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
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

export function SessionReplayPanel() {
  const { http } = useKibanaServices();
  const history = useHistory();
  const {
    rangeId,
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      browser: urlBrowser,
      os: urlOs,
      location: urlLocation,
      pageUrl,
      errorGroup,
      sessionIds,
      frustration,
      user: urlUser,
      click: urlClick,
      account: urlAccount,
      sessionQuery,
      includeBots,
      botUa,
      kuery,
      breakpoint,
      connection,
      device,
      analyticsMode,
      hasReplay: urlHasReplay,
      hasBounced: urlHasBounced,
    },
  } = useLegacyUrlParams();

  const [sessions, setSessions] = useState<RumSessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<SessionListFacets>(EMPTY_FACETS);
  const [stats, setStats] = useState<SessionListStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useRumPageLoading('sessions', loading);

  const [searchInput, setSearchInput] = useState(sessionQuery ?? '');
  const [search, setSearch] = useState(sessionQuery ?? '');
  const [sortField, setSortField] = useState<SessionSortField>('startTime');
  const [sortDirection, setSortDirection] = useState<SessionSortDirection>('desc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [onlyReplay, setOnlyReplay] = useState(urlHasReplay === 'true');
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [onlyRage, setOnlyRage] = useState(false);
  const [onlyBounced, setOnlyBounced] = useState(urlHasBounced === 'true');
  const [browser, setBrowser] = useState<string | undefined>();
  const [os, setOs] = useState<string | undefined>();
  const [durationKey, setDurationKey] = useState('any');

  useEffect(() => {
    setSearchInput(sessionQuery ?? '');
    setSearch(sessionQuery ?? '');
  }, [sessionQuery]);

  useEffect(() => {
    setOnlyReplay(urlHasReplay === 'true');
  }, [urlHasReplay]);

  useEffect(() => {
    setOnlyBounced(urlHasBounced === 'true');
  }, [urlHasBounced]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = searchInput.trim();
      setSearch(next);
      setPageIndex(0);
      if (next !== (sessionQuery ?? '')) {
        history.replace({
          ...history.location,
          search: mergeRumSearch(history.location.search, { sessionQuery: next }),
        });
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [history, searchInput, sessionQuery]);

  const duration = useMemo(
    () => DURATION_OPTIONS.find((option) => option.key === durationKey) ?? DURATION_OPTIONS[0],
    [durationKey]
  );

  const resetPage = useCallback((fn: () => void) => {
    fn();
    setPageIndex(0);
  }, []);

  const loadSessions = useCallback(async () => {
    void rangeId;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSessionReplaySessions({
        http,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        query: search || undefined,
        sortField,
        sortDirection,
        page: pageIndex,
        perPage: pageSize,
        hasReplay: onlyReplay || undefined,
        hasErrors: onlyErrors || undefined,
        hasRage: onlyRage || undefined,
        hasBounced: onlyBounced || undefined,
        browser: urlBrowser || browser,
        os: urlOs || os,
        location: typeof urlLocation === 'string' ? urlLocation : undefined,
        pageUrl,
        errorGroup,
        sessionIds,
        frustration,
        minDurationMs: duration.min,
        maxDurationMs: duration.max,
        user: urlUser,
        click: urlClick,
        account: urlAccount,
        includeBots,
        botUa,
        kuery,
        breakpoint,
        connection,
        device,
        analyticsMode,
      });
      setSessions(result.sessions);
      setTotal(result.total);
      setFacets(result.facets);
      setStats(result.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSessions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    http,
    rangeFrom,
    rangeTo,
    serviceName,
    search,
    sortField,
    sortDirection,
    pageIndex,
    pageSize,
    onlyReplay,
    onlyErrors,
    onlyRage,
    onlyBounced,
    browser,
    os,
    duration,
    urlBrowser,
    urlOs,
    urlLocation,
    pageUrl,
    errorGroup,
    sessionIds,
    frustration,
    urlUser,
    urlClick,
    urlAccount,
    includeBots,
    botUa,
    kuery,
    breakpoint,
    connection,
    device,
    analyticsMode,
    rangeId,
  ]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const openDetail = useCallback(
    (sessionId: string) => {
      pushRumPath(history, `/session-replay/${encodeURIComponent(sessionId)}`);
    },
    [history]
  );

  const openPlayer = useCallback(
    (sessionId: string) => {
      pushRumPath(history, `/session-replay/${encodeURIComponent(sessionId)}/replay`);
    },
    [history]
  );

  const onTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<RumSessionSummary>) => {
      if (sort && (sort.field !== sortField || sort.direction !== sortDirection)) {
        setSortField(sort.field as SessionSortField);
        setSortDirection(sort.direction);
        setPageIndex(0);
        return;
      }
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
    },
    [sortField, sortDirection]
  );

  const setUserFilter = useCallback(
    (next?: string) => {
      setPageIndex(0);
      history.push({
        ...history.location,
        search: mergeRumSearch(history.location.search, { user: next ?? '' }),
      });
    },
    [history]
  );

  const toggleIncludeBots = useCallback(() => {
    setPageIndex(0);
    history.push({
      ...history.location,
      search: mergeRumSearch(history.location.search, {
        includeBots: includeBots === 'true' ? '' : 'true',
      }),
    });
  }, [history, includeBots]);

  const userFacetOptions = useMemo(() => {
    const options = facets.users.map((bucket) => ({ key: bucket.key, count: bucket.count }));
    if (urlUser && !options.some((option) => option.key === urlUser)) {
      return [{ key: urlUser }, ...options];
    }
    return options;
  }, [facets.users, urlUser]);

  const columns: Array<EuiBasicTableColumn<RumSessionSummary>> = [
    {
      field: 'user',
      name: i18n.translate('xpack.ux.sessions.table.user', { defaultMessage: 'User' }),
      width: '210px',
      render: (_: RumSessionSummary['user'], item) => {
        const userKey = userGroupKey(item.user);
        return (
          <UserCell
            user={item.user}
            client={item.client}
            onOpen={userKey ? () => setUserFilter(userKey) : undefined}
          />
        );
      },
    },
    {
      field: 'pagePath',
      name: i18n.translate('xpack.ux.sessions.table.journey', { defaultMessage: 'Journey' }),
      render: (_: string[], item) => <JourneyTrail session={item} />,
    },
    {
      field: 'sparkline',
      name: (
        <HeaderWithTip
          label={i18n.translate('xpack.ux.sessions.table.activity', { defaultMessage: 'Activity' })}
          tip={i18n.translate('xpack.ux.sessions.table.activityTip', {
            defaultMessage:
              'Events over the session timeline. Red bars mark buckets that contain errors.',
          })}
        />
      ),
      width: '120px',
      render: (_: RumSessionSummary['sparkline'], item) => <Sparkline buckets={item.sparkline} />,
    },
    {
      field: 'errorCount',
      name: (
        <HeaderWithTip
          label={i18n.translate('xpack.ux.sessions.table.signals', { defaultMessage: 'Signals' })}
          tip={i18n.translate('xpack.ux.sessions.table.signalsTip', {
            defaultMessage: 'Quality signals: errors and rage clicks. Sort by error count.',
          })}
        />
      ),
      width: '130px',
      sortable: (item) => item.errorCount,
      render: (_: number, item) => <SignalBadges session={item} />,
    },
    {
      field: 'startTime',
      name: i18n.translate('xpack.ux.sessions.table.start', { defaultMessage: 'Start' }),
      width: '130px',
      sortable: true,
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
      name: i18n.translate('xpack.ux.sessions.table.duration', { defaultMessage: 'Duration' }),
      width: '110px',
      sortable: true,
      render: (durationMs: number, item) => (
        <EuiToolTip
          content={i18n.translate('xpack.ux.sessions.table.activeTip', {
            defaultMessage: 'Active {active} of {total}',
            values: {
              active: formatDurationMs(item.activeMs),
              total: formatDurationMs(durationMs),
            },
          })}
        >
          <EuiText size="s" tabIndex={0}>
            {formatDurationMs(durationMs)}
          </EuiText>
        </EuiToolTip>
      ),
    },
    {
      field: 'hasReplay',
      name: i18n.translate('xpack.ux.sessions.table.replay', { defaultMessage: 'Replay' }),
      width: '100px',
      render: (hasReplay: boolean, item) =>
        hasReplay ? (
          item.replayEventCount > 0 ? (
            <EuiToolTip
              content={i18n.translate('xpack.ux.sessions.table.replayEventsTooltip', {
                defaultMessage: '{count} replay events',
                values: { count: item.replayEventCount },
              })}
            >
              <EuiBadge color="success" iconType="play" tabIndex={0}>
                {i18n.translate('xpack.ux.sessions.table.hasReplay', {
                  defaultMessage: 'Available',
                })}
              </EuiBadge>
            </EuiToolTip>
          ) : (
            <EuiBadge color="success" iconType="play" tabIndex={0}>
              {i18n.translate('xpack.ux.sessions.table.hasReplay', {
                defaultMessage: 'Available',
              })}
            </EuiBadge>
          )
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.ux.sessions.table.noReplay', { defaultMessage: 'None' })}
          </EuiText>
        ),
    },
    {
      name: i18n.translate('xpack.ux.sessions.table.actions', { defaultMessage: 'Actions' }),
      width: '110px',
      actions: [
        {
          name: i18n.translate('xpack.ux.sessions.table.details', { defaultMessage: 'Details' }),
          description: i18n.translate('xpack.ux.sessions.table.detailsDescription', {
            defaultMessage: 'Open session details',
          }),
          icon: 'inspect',
          type: 'icon',
          onClick: (item) => openDetail(item.sessionId),
        },
        {
          name: i18n.translate('xpack.ux.sessions.table.play', { defaultMessage: 'Play' }),
          description: i18n.translate('xpack.ux.sessions.table.playDescription', {
            defaultMessage: 'Open session replay player',
          }),
          icon: 'play',
          type: 'icon',
          available: (item) => item.hasReplay,
          'data-test-subj': 'uxSessionPlay',
          onClick: (item) => openPlayer(item.sessionId),
        },
      ],
    },
  ];

  const includeBotsActive = includeBots === 'true';

  const anyFilterActive =
    onlyReplay ||
    onlyErrors ||
    onlyRage ||
    onlyBounced ||
    Boolean(browser) ||
    Boolean(os) ||
    durationKey !== 'any' ||
    Boolean(search) ||
    Boolean(pageUrl) ||
    Boolean(errorGroup) ||
    Boolean(sessionIds) ||
    Boolean(frustration) ||
    Boolean(urlUser) ||
    Boolean(urlClick) ||
    Boolean(urlAccount) ||
    Boolean(urlBrowser) ||
    Boolean(urlOs) ||
    Boolean(urlLocation) ||
    includeBotsActive;

  const clearFilters = useCallback(() => {
    setOnlyReplay(false);
    setOnlyErrors(false);
    setOnlyRage(false);
    setOnlyBounced(false);
    setBrowser(undefined);
    setOs(undefined);
    setDurationKey('any');
    setSearchInput('');
    setSearch('');
    setPageIndex(0);
    history.push({
      ...history.location,
      search: mergeRumSearch(history.location.search, {
        frustration: '',
        pageUrl: '',
        errorGroup: '',
        sessionIds: '',
        browser: '',
        os: '',
        location: '',
        user: '',
        click: '',
        account: '',
        sessionQuery: '',
        includeBots: '',
        botUa: '',
        hasReplay: '',
        hasBounced: '',
      }),
    });
  }, [history]);

  const tourReplayId = sessions.find((session) => session.hasReplay)?.sessionId;

  return (
    <>
      <UxTourReplayState loading={loading} sessionId={tourReplayId} />
      <TabTrendChart accessor="sessions" />
      <EuiSpacer />
      <LiveSessionsPanel />
      <EuiSpacer />
      <EuiPanel paddingSize="m" data-test-subj="uxSessionReplayListPage">
        {(pageUrl ||
          errorGroup ||
          sessionIds ||
          frustration ||
          urlUser ||
          urlLocation ||
          urlHasBounced) && (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              iconType="filter"
              title={i18n.translate('xpack.ux.sessions.deepLinkTitle', {
                defaultMessage: 'Filtered from another view',
              })}
            >
              <p>
                {[
                  pageUrl
                    ? i18n.translate('xpack.ux.sessions.deepLink.page', {
                        defaultMessage: 'Page: {page}',
                        values: { page: pageUrl },
                      })
                    : null,
                  errorGroup
                    ? i18n.translate('xpack.ux.sessions.deepLink.error', {
                        defaultMessage: 'Error group: {group}',
                        values: { group: errorGroup },
                      })
                    : null,
                  frustration
                    ? i18n.translate('xpack.ux.sessions.deepLink.frustration', {
                        defaultMessage: 'Frustration: {kind}',
                        values: { kind: frustration },
                      })
                    : null,
                  urlUser
                    ? i18n.translate('xpack.ux.sessions.deepLink.user', {
                        defaultMessage: 'User: {user}',
                        values: { user: urlUser },
                      })
                    : null,
                  sessionIds
                    ? i18n.translate('xpack.ux.sessions.deepLink.ids', {
                        defaultMessage: '{count} linked sessions',
                        values: { count: sessionIds.split(',').filter(Boolean).length },
                      })
                    : null,
                  urlHasBounced
                    ? i18n.translate('xpack.ux.sessions.deepLink.bounced', {
                        defaultMessage: 'Bounced sessions',
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        )}
        <KpiStrip stats={stats} />
        <EuiSpacer size="m" />

        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.sessions.intro', {
              defaultMessage:
                'Each row is a browser visit. Find a person with an email or user id, or use path:/checkout, click:#buy, error:TypeError, user:ada, or account:acme. Journey shows page path changes (A → B → C), or in-page activity when the URL does not change.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              placeholder={i18n.translate('xpack.ux.sessions.searchPlaceholder', {
                defaultMessage:
                  'ada@elastic.co  path:/checkout  click:#buy  error:TypeError  — or user / page / session id',
              })}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              isClearable
              data-test-subj="uxSessionSearch"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <EuiFilterButton
                hasActiveFilters={onlyReplay}
                onClick={() =>
                  resetPage(() => {
                    const next = !onlyReplay;
                    setOnlyReplay(next);
                    history.replace({
                      ...history.location,
                      search: mergeRumSearch(history.location.search, {
                        hasReplay: next ? 'true' : '',
                      }),
                    });
                  })
                }
                numFilters={facets.hasReplay}
                data-test-subj="uxSessionFilterReplay"
              >
                <UxTourAnchor stepId="inspect">
                  <span>
                    {i18n.translate('xpack.ux.sessions.filter.hasReplay', {
                      defaultMessage: 'Has replay',
                    })}
                  </span>
                </UxTourAnchor>
              </EuiFilterButton>
              <EuiFilterButton
                hasActiveFilters={onlyErrors}
                onClick={() => resetPage(() => setOnlyErrors((v) => !v))}
                numFilters={facets.hasErrors}
                data-test-subj="uxSessionFilterErrors"
              >
                {i18n.translate('xpack.ux.sessions.filter.hasErrors', {
                  defaultMessage: 'Has errors',
                })}
              </EuiFilterButton>
              <EuiFilterButton
                hasActiveFilters={onlyRage}
                onClick={() => resetPage(() => setOnlyRage((v) => !v))}
                numFilters={facets.hasRage}
                data-test-subj="uxSessionFilterRage"
              >
                {i18n.translate('xpack.ux.sessions.filter.hasRage', {
                  defaultMessage: 'Rage clicks',
                })}
              </EuiFilterButton>
              <EuiFilterButton
                hasActiveFilters={onlyBounced}
                onClick={() =>
                  resetPage(() => {
                    const next = !onlyBounced;
                    setOnlyBounced(next);
                    history.replace({
                      ...history.location,
                      search: mergeRumSearch(history.location.search, {
                        hasBounced: next ? 'true' : '',
                      }),
                    });
                  })
                }
                numFilters={facets.hasBounced}
                data-test-subj="uxSessionFilterBounced"
              >
                {i18n.translate('xpack.ux.sessions.filter.hasBounced', {
                  defaultMessage: 'Bounced',
                })}
              </EuiFilterButton>
            </EuiFilterGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <FacetSelect
                label={i18n.translate('xpack.ux.sessions.filter.browser', {
                  defaultMessage: 'Browser',
                })}
                options={facets.browsers.map((bucket) => ({
                  key: bucket.key,
                  count: bucket.count,
                }))}
                value={urlBrowser || browser}
                searchable
                onChange={(next) => {
                  resetPage(() => setBrowser(next));
                  history.push({
                    ...history.location,
                    search: mergeRumSearch(history.location.search, { browser: next ?? '' }),
                  });
                }}
              />
              <FacetSelect
                label={i18n.translate('xpack.ux.sessions.filter.os', { defaultMessage: 'OS' })}
                options={facets.os.map((bucket) => ({ key: bucket.key, count: bucket.count }))}
                value={urlOs || os}
                searchable
                onChange={(next) => {
                  resetPage(() => setOs(next));
                  history.push({
                    ...history.location,
                    search: mergeRumSearch(history.location.search, { os: next ?? '' }),
                  });
                }}
              />
              <FacetSelect
                label={i18n.translate('xpack.ux.sessions.filter.country', {
                  defaultMessage: 'Country',
                })}
                options={facets.countries.map((bucket) => ({
                  key: bucket.key,
                  count: bucket.count,
                }))}
                value={typeof urlLocation === 'string' ? urlLocation : undefined}
                searchable
                onChange={(next) => {
                  setPageIndex(0);
                  history.push({
                    ...history.location,
                    search: mergeRumSearch(history.location.search, { location: next ?? '' }),
                  });
                }}
              />
              <FacetSelect
                label={i18n.translate('xpack.ux.sessions.filter.user', { defaultMessage: 'User' })}
                options={userFacetOptions}
                value={urlUser}
                searchable
                onChange={setUserFilter}
              />
              <FacetSelect
                label={i18n.translate('xpack.ux.sessions.filter.duration', {
                  defaultMessage: 'Duration',
                })}
                options={DURATION_OPTIONS.filter((option) => option.key !== 'any').map(
                  (option) => ({
                    key: option.key,
                    label: option.label,
                  })
                )}
                value={durationKey === 'any' ? undefined : durationKey}
                onChange={(next) => resetPage(() => setDurationKey(next ?? 'any'))}
              />
              <EuiFilterButton
                hasActiveFilters={includeBotsActive}
                onClick={toggleIncludeBots}
                data-test-subj="uxSessionFilterIncludeBots"
              >
                {i18n.translate('xpack.ux.sessions.filter.includeBots', {
                  defaultMessage: 'Include bots',
                })}
              </EuiFilterButton>
            </EuiFilterGroup>
          </EuiFlexItem>
          {anyFilterActive && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="cross"
                onClick={clearFilters}
                data-test-subj="uxSessionClearFilters"
              >
                {i18n.translate('xpack.ux.sessions.filter.clear', { defaultMessage: 'Clear' })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {!loading && !error && total === 1 && sessions[0]?.hasReplay && (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              color="success"
              iconType="play"
              title={i18n.translate('xpack.ux.sessions.singleReplayTitle', {
                defaultMessage: 'One matching session has a replay',
              })}
            >
              <EuiButtonEmpty
                size="s"
                iconType="play"
                data-test-subj="uxSessionOpenOnlyReplay"
                onClick={() => {
                  const sessionId = sessions[0]?.sessionId;
                  if (sessionId) {
                    openPlayer(sessionId);
                  }
                }}
              >
                {i18n.translate('xpack.ux.sessions.openOnlyReplayButtonLabel', {
                  defaultMessage: 'Open replay',
                })}
              </EuiButtonEmpty>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {error ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="error"
            title={
              <h2>
                {i18n.translate('xpack.ux.sessions.loadErrorTitle', {
                  defaultMessage: 'Unable to load sessions',
                })}
              </h2>
            }
            body={<p>{error}</p>}
            actions={
              <EuiButtonEmpty data-test-subj="uxSessionListPageRetryButton" onClick={loadSessions}>
                {i18n.translate('xpack.ux.sessions.retry', { defaultMessage: 'Retry' })}
              </EuiButtonEmpty>
            }
          />
        ) : (
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.ux.sessions.tableCaption', {
              defaultMessage: 'User sessions',
            })}
            items={sessions}
            columns={columns}
            loading={loading}
            sorting={{ sort: { field: sortField, direction: sortDirection } }}
            pagination={{
              pageIndex,
              pageSize,
              totalItemCount: total,
              pageSizeOptions: [10, 25, 50],
            }}
            onChange={onTableChange}
            rowProps={(item) => ({
              onClick: () => openDetail(item.sessionId),
              style: { cursor: 'pointer' },
              'data-test-subj': item.hasReplay
                ? `${UX_SESSION_REPLAY_ROW_PREFIX}${item.sessionId}`
                : `uxSessionRow-${item.sessionId}`,
            })}
            noItemsMessage={i18n.translate('xpack.ux.sessions.empty', {
              defaultMessage:
                'No sessions found for this time range. Capture traffic with EDOT Browser (session.id on traces/logs), or enable Session Replay.',
            })}
            data-test-subj="uxSessionReplayTable"
          />
        )}
      </EuiPanel>
    </>
  );
}
