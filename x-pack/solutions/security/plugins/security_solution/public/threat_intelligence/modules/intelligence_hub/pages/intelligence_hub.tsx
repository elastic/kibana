/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiContextMenu,
  EuiCallOut,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
  EuiPageTemplate,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import {
  DASHBOARD_OVERVIEW_API_PATH,
  FIND_THREAT_REPORTS_API_PATH,
  HUNT_FINDINGS_API_PATH,
  SYNTHESIZE_ADVISORY_API_PATH,
  DEFAULT_REGIONS_SETTING_KEY,
  DEFAULT_TIME_RANGE_PRESET,
  SAVED_VIEWS_API_PATH,
  TIME_RANGE_PRESET_IDS,
  isTimeRangePresetId,
  resolveTimeRangeFromPreset,
  SEVERITY_LEVELS,
  SUBMIT_SUBSCRIPTION_API_PATH,
  SUBSCRIPTION_TEMPLATES,
  THREAT_CATEGORIES,
  THREAT_REGIONS,
  getSubscriptionTemplate,
  type DashboardOverviewResponse,
  type ReportSortBy,
  type SavedViewSummary,
  type SeverityLevel,
  type SubscriptionTemplate,
  type ThreatCategory,
  type ThreatRegion,
  type TimeRangePresetId,
} from '../../../../../common/threat_intelligence/hub';
import { useKibana } from '../../../../common/lib/kibana';
import {
  fromFindThreatReportHit,
  type ReportFeedSort,
  type ThreatReportFeedItem,
} from '../../../components/report_feed';
import {
  IntelligenceHubDashboardView,
  StatsRibbon,
  type IntelligenceHubChipFilters,
} from '../components/intelligence_hub_dashboard';
import { ContinuousHuntStatusStrip } from '../components/continuous_hunt_status_strip';
import { DigestsTab } from '../components/digests_tab';
import { SourcesTab } from '../components/sources_tab';
import {
  DEFAULT_HUNT_FINDINGS_PAGE_SIZE,
  emptyHuntFindingsFilters,
  HuntFindingsPanel,
  type FeedbackLoopSummary,
  type HuntFindingListItem,
  type HuntFindingsSortBy,
  type HuntFindingsSortOrder,
  type HuntFindingsTableFilters,
} from '../components/hunt_findings_panel';
import { CorrelationReportPage } from '../../correlation_report';

type IntelligenceHubTabId = 'overview' | 'hunt_findings' | 'sources' | 'digests';

const emptyFilters: IntelligenceHubChipFilters = {
  regions: [],
  categories: [],
  severities: [],
};

/** Matches former overview `recent_articles` top_hits window. */
const THREAT_REPORT_FEED_PAGE_SIZE = 12;

/**
 * Map Hub feed sort UI → `find_threat_reports` `sort_by`.
 * Browse mode (no free-text query) cannot use RRF; `relevance` → `recency`
 * so the default matches the old `@timestamp desc` sample.
 */
const mapReportFeedSortToApi = (sort: ReportFeedSort): ReportSortBy => {
  switch (sort) {
    case 'severity':
      return 'severity';
    case 'date':
      return 'recency';
    case 'relevance':
    default:
      return 'recency';
  }
};

const timeRangePresetLabel = (preset: TimeRangePresetId): string => {
  switch (preset) {
    case '24h':
      return i18n.translate('xpack.securitySolution.threatIntelligence.app.timeRange24h', {
        defaultMessage: 'Last 24 hours',
      });
    case '7d':
      return i18n.translate('xpack.securitySolution.threatIntelligence.app.timeRange7d', {
        defaultMessage: 'Last 7 days',
      });
    case '30d':
      return i18n.translate('xpack.securitySolution.threatIntelligence.app.timeRange30d', {
        defaultMessage: 'Last 30 days',
      });
    case '90d':
      return i18n.translate('xpack.securitySolution.threatIntelligence.app.timeRange90d', {
        defaultMessage: 'Last 90 days',
      });
  }
};

/**
 * Intelligence Hub dashboard page. Migrated from the standalone
 * threat-intelligence plugin's `app/intelligence_hub_app.tsx` when the
 * plugin was folded into `securitySolution`. Two functional changes from
 * the migration:
 *
 *  1. `core: CoreStart` prop replaced with the `useKibana()` hook so the
 *     page is mounted directly by the security_solution React Router
 *     (`routes.tsx`) rather than through a per-app `renderApp` entry —
 *     consistent with how `IndicatorsPage` works.
 *  2. i18n keys renamed from `xpack.securitySolution.threatIntelligence.app.*` to
 *     `xpack.securitySolution.threatIntelligence.app.*`. Existing
 *     translations under the old namespace are dropped — see the
 *     i18n-rename note in the AGENTS.md migration plan.
 *
 * Layout follows the bespoke CISO-news prototype dashboard
 * (`elastic/security-ciso-news-aggregator`): filter chip row with feed
 * count + Schedule & Deliver, stats ribbon with severity distribution +
 * top-threat, 3-column visualization row (Threat Radar / Activity
 * Timeline / Categories), severity + category chip filters with sort
 * toggle, 3-column article grid with severity accent bars, then
 * Environment Impact lower down. A free-text
 * "ask for a brief" entry point belongs at the top of the page, but is
 * intentionally absent until the dashboard read accepts a `q` parameter.
 * The Threat reports grid is backed by paginated `FIND_THREAT_REPORTS_API_PATH`
 * (same time range + region/category filters as overview stats), not the
 * overview `recent_articles` top_hits sample.
 *
 * `data-test-subj` values (`threatIntelExport*`, `threatIntelSaveView*`)
 * are preserved intentionally so existing functional tests keep
 * targeting the same elements after the move.
 */
export const IntelligenceHubPage: FC = () => {
  const { http, uiSettings, notifications, application } = useKibana().services;
  const location = useLocation();
  const history = useHistory();
  const highlightReportId = useMemo(
    () => new URLSearchParams(location.search).get('highlightReportId') ?? undefined,
    [location.search]
  );
  const onHighlightReport = useCallback(
    (reportId: string) => {
      const params = new URLSearchParams(location.search);
      params.set('highlightReportId', reportId);
      history.replace({ ...location, search: params.toString() });
    },
    [history, location]
  );
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [feedItems, setFeedItems] = useState<ThreatReportFeedItem[]>([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedPageIndex, setFeedPageIndex] = useState(0);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [huntFindings, setHuntFindings] = useState<HuntFindingListItem[]>([]);
  const [huntFindingsTotal, setHuntFindingsTotal] = useState(0);
  const [huntFindingsNewTotal, setHuntFindingsNewTotal] = useState(0);
  const [huntFindingsFeedbackLoop, setHuntFindingsFeedbackLoop] = useState<FeedbackLoopSummary[]>(
    []
  );
  const [isLoadingHuntFindings, setIsLoadingHuntFindings] = useState(false);
  const [huntFindingsPageIndex, setHuntFindingsPageIndex] = useState(0);
  const [huntFindingsPageSize, setHuntFindingsPageSize] = useState(DEFAULT_HUNT_FINDINGS_PAGE_SIZE);
  const [huntFindingsSortBy, setHuntFindingsSortBy] = useState<HuntFindingsSortBy>('recency');
  const [huntFindingsSortOrder, setHuntFindingsSortOrder] = useState<HuntFindingsSortOrder>('desc');
  const [huntFindingsFilters, setHuntFindingsFilters] =
    useState<HuntFindingsTableFilters>(emptyHuntFindingsFilters);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<IntelligenceHubChipFilters>(emptyFilters);
  const [savedViews, setSavedViews] = useState<SavedViewSummary[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [savedViewsPopoverOpen, setSavedViewsPopoverOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<IntelligenceHubTabId>('overview');
  const [correlationFlyoutOpen, setCorrelationFlyoutOpen] = useState(false);
  const [correlationReportId, setCorrelationReportId] = useState<string | undefined>();
  const [correlationAutoRun, setCorrelationAutoRun] = useState(false);
  const [savedViewsLoaded, setSavedViewsLoaded] = useState(false);
  const [sortBy, setSortBy] = useState<ReportFeedSort>('relevance');
  const [timeRangePreset, setTimeRangePreset] =
    useState<TimeRangePresetId>(DEFAULT_TIME_RANGE_PRESET);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [isGeneratingAdvisory, setIsGeneratingAdvisory] = useState(false);
  const [headerOverflowOpen, setHeaderOverflowOpen] = useState(false);

  useEffect(() => {
    const defaultRegions = (uiSettings.get(DEFAULT_REGIONS_SETTING_KEY, []) ??
      []) as ThreatRegion[];
    if (defaultRegions.length > 0) {
      setFilters((prev) => ({ ...prev, regions: defaultRegions }));
    }
  }, [uiSettings]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { from, to } = resolveTimeRangeFromPreset(timeRangePreset);
    try {
      const response = await http.get<DashboardOverviewResponse>(DASHBOARD_OVERVIEW_API_PATH, {
        version: '2023-10-31',
        query: {
          from,
          to,
          ...(filters.regions.length ? { regions: filters.regions } : {}),
          ...(filters.categories.length ? { categories: filters.categories } : {}),
        },
      });
      setData(response);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      setError(err?.body?.message ?? err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [http, filters.regions, filters.categories, timeRangePreset]);

  const fetchHuntFindings = useCallback(
    async (pageIndex: number, pageSize: number) => {
      setIsLoadingHuntFindings(true);
      const { from, to } = resolveTimeRangeFromPreset(timeRangePreset);
      try {
        const response = await http.get<{
          findings: HuntFindingListItem[];
          total: number;
          feedback_loop?: FeedbackLoopSummary[];
        }>(HUNT_FINDINGS_API_PATH, {
          version: '2023-10-31',
          query: {
            from,
            to,
            size: pageSize,
            offset: pageIndex * pageSize,
            sort_by: huntFindingsSortBy,
            sort_order: huntFindingsSortOrder,
            ...(huntFindingsFilters.statuses.length
              ? { statuses: huntFindingsFilters.statuses }
              : {}),
            ...(huntFindingsFilters.severities.length
              ? { severities: huntFindingsFilters.severities }
              : {}),
            ...(typeof huntFindingsFilters.minConfidence === 'number'
              ? { min_confidence: huntFindingsFilters.minConfidence }
              : {}),
            ...(huntFindingsFilters.q.trim() ? { q: huntFindingsFilters.q.trim() } : {}),
          },
        });
        setHuntFindings(response.findings ?? []);
        setHuntFindingsTotal(response.total ?? 0);
        setHuntFindingsFeedbackLoop(response.feedback_loop ?? []);
      } catch (err) {
        setHuntFindings([]);
        setHuntFindingsTotal(0);
        notifications.toasts.addError(err as Error, {
          title: i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingsLoadError',
            { defaultMessage: 'Failed to load hunt findings' }
          ),
        });
      } finally {
        setIsLoadingHuntFindings(false);
      }
    },
    [
      http,
      huntFindingsFilters.minConfidence,
      huntFindingsFilters.q,
      huntFindingsFilters.severities,
      huntFindingsFilters.statuses,
      huntFindingsSortBy,
      huntFindingsSortOrder,
      notifications.toasts,
      timeRangePreset,
    ]
  );

  const fetchHuntFindingsNewCount = useCallback(async () => {
    const { from, to } = resolveTimeRangeFromPreset(timeRangePreset);
    try {
      const response = await http.get<{ total: number }>(HUNT_FINDINGS_API_PATH, {
        version: '2023-10-31',
        query: {
          from,
          to,
          size: 1,
          offset: 0,
          statuses: 'new',
        },
      });
      setHuntFindingsNewTotal(response.total ?? 0);
    } catch {
      setHuntFindingsNewTotal(0);
    }
  }, [http, timeRangePreset]);

  const fetchThreatReportFeed = useCallback(
    async (pageIndex: number) => {
      setIsLoadingFeed(true);
      const { from, to } = resolveTimeRangeFromPreset(timeRangePreset);
      try {
        const response = await http.post<{
          total: number;
          reports: Array<Parameters<typeof fromFindThreatReportHit>[0]>;
        }>(FIND_THREAT_REPORTS_API_PATH, {
          version: '2023-10-31',
          body: JSON.stringify({
            size: THREAT_REPORT_FEED_PAGE_SIZE,
            from: pageIndex * THREAT_REPORT_FEED_PAGE_SIZE,
            time_range: { from, to },
            sort_by: mapReportFeedSortToApi(sortBy),
            ...(filters.regions.length ? { regions: filters.regions } : {}),
            ...(filters.categories.length ? { categories: filters.categories } : {}),
            ...(filters.severities.length ? { severities: filters.severities } : {}),
          }),
        });
        setFeedItems((response.reports ?? []).map(fromFindThreatReportHit));
        setFeedTotal(response.total ?? 0);
      } catch (err) {
        setFeedItems([]);
        setFeedTotal(0);
        notifications.toasts.addError(err as Error, {
          title: i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.threatReportFeedError',
            { defaultMessage: 'Failed to load threat reports' }
          ),
        });
      } finally {
        setIsLoadingFeed(false);
      }
    },
    [
      filters.categories,
      filters.regions,
      filters.severities,
      http,
      notifications.toasts,
      sortBy,
      timeRangePreset,
    ]
  );

  const generateAdvisory = useCallback(async () => {
    setIsGeneratingAdvisory(true);
    const { from, to } = resolveTimeRangeFromPreset(timeRangePreset);
    try {
      const result = await http.post<{
        status: string;
        message?: string;
      }>(SYNTHESIZE_ADVISORY_API_PATH, {
        version: '2023-10-31',
        body: JSON.stringify({
          time_range: { from, to },
          persist: true,
          max_reports: 20,
          ...(filters.regions.length ? { regions: filters.regions } : {}),
          ...(filters.categories.length ? { categories: filters.categories } : {}),
        }),
      });
      if (result.status === 'no_reports') {
        notifications.toasts.addWarning(
          i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.generateAdvisoryNoReports',
            { defaultMessage: 'No reports matched the current filters and time range.' }
          )
        );
      } else if (result.status === 'no_inference') {
        notifications.toasts.addWarning(
          i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.generateAdvisoryNoInference',
            {
              defaultMessage:
                'A GenAI connector is required to generate an executive summary. Configure one in Stack Management.',
            }
          )
        );
      } else {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.securitySolution.threatIntelligence.app.generateAdvisorySuccess', {
            defaultMessage: 'Executive summary updated.',
          })
        );
        await fetchOverview();
      }
    } catch (err) {
      notifications.toasts.addError(err as Error, {
        title: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.generateAdvisoryError',
          { defaultMessage: 'Failed to generate executive summary' }
        ),
      });
    } finally {
      setIsGeneratingAdvisory(false);
    }
  }, [
    fetchOverview,
    filters.categories,
    filters.regions,
    http,
    notifications.toasts,
    timeRangePreset,
  ]);

  const focusSourceReports = useCallback(() => {
    document
      .getElementById('threat-intel-report-feed')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const fetchSavedViews = useCallback(async () => {
    try {
      const response = await http.get<{ views: SavedViewSummary[] }>(SAVED_VIEWS_API_PATH, {
        version: '2023-10-31',
      });
      setSavedViews(response.views ?? []);
    } catch {
      // Saved views are optional. Missing permissions etc. shouldn't kill
      // the dashboard.
      setSavedViews([]);
    } finally {
      setSavedViewsLoaded(true);
    }
  }, [http]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    setFeedPageIndex(0);
    void fetchThreatReportFeed(0);
  }, [fetchThreatReportFeed]);

  useEffect(() => {
    setHuntFindingsPageIndex(0);
    void fetchHuntFindings(0, huntFindingsPageSize);
  }, [fetchHuntFindings, huntFindingsPageSize]);

  useEffect(() => {
    void fetchHuntFindingsNewCount();
  }, [fetchHuntFindingsNewCount]);

  useEffect(() => {
    fetchSavedViews();
  }, [fetchSavedViews]);

  const applySavedView = useCallback(
    (id: string) => {
      const found = savedViews.find((v) => v.id === id);
      if (!found) return;
      setActiveViewId(id);
      setFilters((prev) => ({
        ...prev,
        regions: found.filters.regions ?? [],
        categories: found.filters.categories ?? [],
      }));
      const preset = found.filters.time_range_preset;
      setTimeRangePreset(
        preset && isTimeRangePresetId(preset) ? preset : DEFAULT_TIME_RANGE_PRESET
      );
    },
    [savedViews]
  );

  const onTimeRangePresetChange = useCallback((preset: TimeRangePresetId) => {
    setTimeRangePreset(preset);
    setActiveViewId('');
  }, []);

  const saveCurrentView = useCallback(
    async (name: string, description?: string) => {
      try {
        const created = await http.post<SavedViewSummary>(SAVED_VIEWS_API_PATH, {
          version: '2023-10-31',
          body: JSON.stringify({
            name,
            description,
            filters: {
              ...(filters.regions.length ? { regions: filters.regions } : {}),
              ...(filters.categories.length ? { categories: filters.categories } : {}),
              time_range_preset: timeRangePreset,
            },
          }),
        });
        setSavedViews((prev) => [created, ...prev]);
        setActiveViewId(created.id);
        setShowSaveModal(false);
      } catch (err) {
        notifications.toasts.addDanger({
          title: i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.saveViewFailedTitle',
            {
              defaultMessage: 'Failed to save view',
            }
          ),
          text:
            (err as { body?: { message?: string }; message?: string }).body?.message ??
            (err as Error).message,
        });
      }
    },
    [http, notifications.toasts, filters.regions, filters.categories, timeRangePreset]
  );

  const isRefreshing = loading && data !== null;

  const openCorrelationFlyout = useCallback(() => {
    setCorrelationReportId(undefined);
    setCorrelationAutoRun(false);
    setCorrelationFlyoutOpen(true);
  }, []);

  const onCorrelateReport = useCallback((reportId: string) => {
    setCorrelationReportId(reportId);
    setCorrelationAutoRun(true);
    setCorrelationFlyoutOpen(true);
  }, []);

  const onFeedPageChange = useCallback(
    (pageIndex: number) => {
      setFeedPageIndex(pageIndex);
      void fetchThreatReportFeed(pageIndex);
    },
    [fetchThreatReportFeed]
  );

  const onFeedSortChange = useCallback((next: ReportFeedSort) => {
    setSortBy(next);
  }, []);

  const onHuntFindingsPageChange = useCallback(
    (pageIndex: number, pageSize: number) => {
      if (pageSize !== huntFindingsPageSize) {
        setHuntFindingsPageIndex(0);
        setHuntFindingsPageSize(pageSize);
        return;
      }
      setHuntFindingsPageIndex(pageIndex);
      void fetchHuntFindings(pageIndex, pageSize);
    },
    [fetchHuntFindings, huntFindingsPageSize]
  );

  const onHuntFindingsSortChange = useCallback(
    (nextSortBy: HuntFindingsSortBy, nextSortOrder: HuntFindingsSortOrder) => {
      setHuntFindingsSortBy(nextSortBy);
      setHuntFindingsSortOrder(nextSortOrder);
    },
    []
  );

  const onHuntFindingsFiltersChange = useCallback((next: HuntFindingsTableFilters) => {
    setHuntFindingsFilters(next);
  }, []);

  const refreshHuntFindings = useCallback(() => {
    void fetchHuntFindings(huntFindingsPageIndex, huntFindingsPageSize);
    void fetchHuntFindingsNewCount();
  }, [fetchHuntFindings, fetchHuntFindingsNewCount, huntFindingsPageIndex, huntFindingsPageSize]);

  const toggleSeverity = useCallback((severity: SeverityLevel) => {
    setFilters((prev) => ({
      ...prev,
      severities: prev.severities.includes(severity)
        ? prev.severities.filter((s) => s !== severity)
        : [...prev.severities, severity],
    }));
  }, []);

  const toggleCategoryChip = useCallback((category: ThreatCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  }, []);

  const clearChipFilters = useCallback(() => {
    setFilters((prev) => ({ ...prev, severities: [], categories: [] }));
  }, []);

  const renderOverviewTab = () => {
    if (loading && !data) {
      return (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={
            <h2>
              {i18n.translate('xpack.securitySolution.threatIntelligence.app.loadingTitle', {
                defaultMessage: 'Loading intelligence overview…',
              })}
            </h2>
          }
        />
      );
    }

    if (error) {
      return (
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.securitySolution.threatIntelligence.app.errorTitle', {
            defaultMessage: 'Failed to load dashboard',
          })}
          color="danger"
          iconType="alert"
        >
          {error}
        </EuiCallOut>
      );
    }

    if (!data) {
      return null;
    }

    return (
      <IntelligenceHubDashboardView
        data={data}
        feedItems={feedItems}
        feedPagination={{
          pageIndex: feedPageIndex,
          pageSize: THREAT_REPORT_FEED_PAGE_SIZE,
          totalItemCount: feedTotal,
          onChangePage: onFeedPageChange,
        }}
        isLoadingFeed={isLoadingFeed}
        filters={filters}
        sortBy={sortBy}
        onSortChange={onFeedSortChange}
        onToggleSeverity={toggleSeverity}
        onToggleCategory={toggleCategoryChip}
        onClearChipFilters={clearChipFilters}
        highlightReportId={highlightReportId}
        onHighlightReport={onHighlightReport}
        isGeneratingAdvisory={isGeneratingAdvisory}
        onGenerateAdvisory={() => {
          void generateAdvisory();
        }}
        onFocusSourceReports={focusSourceReports}
        onCorrelateReport={onCorrelateReport}
      />
    );
  };

  const tabs = useMemo(
    () =>
      [
        {
          id: 'overview' as const,
          name: i18n.translate('xpack.securitySolution.threatIntelligence.app.tabOverview', {
            defaultMessage: 'Overview',
          }),
        },
        {
          id: 'hunt_findings' as const,
          name: (
            <span>
              {i18n.translate('xpack.securitySolution.threatIntelligence.app.tabHuntFindings', {
                defaultMessage: 'Hunt findings',
              })}
              {huntFindingsNewTotal > 0 ? (
                <>
                  {' '}
                  <EuiBadge color="accent">
                    {i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.tabHuntFindingsNewBadge',
                      {
                        defaultMessage: '{count} new',
                        values: { count: huntFindingsNewTotal },
                      }
                    )}
                  </EuiBadge>
                </>
              ) : null}
            </span>
          ),
        },
        {
          id: 'sources' as const,
          name: i18n.translate('xpack.securitySolution.threatIntelligence.app.tabSources', {
            defaultMessage: 'Sources',
          }),
        },
        {
          id: 'digests' as const,
          name: i18n.translate('xpack.securitySolution.threatIntelligence.app.tabDigests', {
            defaultMessage: 'Digests',
          }),
        },
      ] satisfies Array<{ id: IntelligenceHubTabId; name: React.ReactNode }>,
    [huntFindingsNewTotal]
  );

  const renderTabPanel = () => {
    switch (selectedTab) {
      case 'overview':
        return renderOverviewTab();
      case 'hunt_findings':
        return (
          <HuntFindingsPanel
            findings={huntFindings}
            total={huntFindingsTotal}
            pageIndex={huntFindingsPageIndex}
            pageSize={huntFindingsPageSize}
            sortBy={huntFindingsSortBy}
            sortOrder={huntFindingsSortOrder}
            filters={huntFindingsFilters}
            timeRangeLabel={timeRangePresetLabel(timeRangePreset)}
            feedbackLoop={huntFindingsFeedbackLoop}
            isLoading={isLoadingHuntFindings}
            onPageChange={onHuntFindingsPageChange}
            onSortChange={onHuntFindingsSortChange}
            onFiltersChange={onHuntFindingsFiltersChange}
            onHighlightReport={onHighlightReport}
            onCorrelateReport={onCorrelateReport}
            onDeployed={refreshHuntFindings}
            http={http}
            notifications={notifications}
            application={application}
          />
        );
      case 'sources':
        return <SourcesTab http={http} timeRangePreset={timeRangePreset} />;
      case 'digests':
        return <DigestsTab http={http} timeRangePreset={timeRangePreset} />;
    }
  };

  return (
    <EuiPageTemplate restrictWidth={false} grow={true}>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.securitySolution.threatIntelligence.app.pageTitle', {
          defaultMessage: 'Intelligence Hub',
        })}
        rightSideItems={[
          <EuiPopover
            key="overflow"
            isOpen={headerOverflowOpen}
            closePopover={() => setHeaderOverflowOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downRight"
            button={
              <EuiButtonIcon
                display="empty"
                size="m"
                iconType="boxesVertical"
                aria-label={i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.headerOverflowAriaLabel',
                  { defaultMessage: 'More actions' }
                )}
                onClick={() => setHeaderOverflowOpen((open) => !open)}
                data-test-subj="intelligenceHubHeaderOverflowBtn"
              />
            }
          >
            <EuiContextMenu
              initialPanelId={0}
              panels={[
                {
                  id: 0,
                  items: [
                    {
                      name: i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.exportPdfBtn',
                        { defaultMessage: 'Export to PDF' }
                      ),
                      icon: 'exportAction',
                      'data-test-subj': 'threatIntelExportPdfBtn',
                      onClick: () => {
                        setHeaderOverflowOpen(false);
                        window.print();
                      },
                    },
                  ],
                },
              ]}
            />
          </EuiPopover>,
          <EuiButton
            key="schedule"
            iconType="email"
            fill
            onClick={() => setShowScheduleModal(true)}
            data-test-subj="threatIntelScheduleDeliverBtn"
          >
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.scheduleDeliverBtn', {
              defaultMessage: 'Schedule & deliver',
            })}
          </EuiButton>,
          <EuiButton
            key="correlation"
            iconType="inspect"
            onClick={openCorrelationFlyout}
            data-test-subj="intelligenceHubCorrelationBtn"
          >
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.correlationReportBtn', {
              defaultMessage: 'Threat correlation',
            })}
          </EuiButton>,
        ]}
        rightSideGroupProps={{ alignItems: 'center' }}
      />
      <EuiPageTemplate.Section>
        <ContinuousHuntStatusStrip />
        <EuiSpacer size="m" />
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          timeRangePreset={timeRangePreset}
          onTimeRangePresetChange={onTimeRangePresetChange}
          savedViews={savedViews}
          activeViewId={activeViewId}
          onApplySavedView={applySavedView}
          savedViewsLoaded={savedViewsLoaded}
          savedViewsPopoverOpen={savedViewsPopoverOpen}
          onSavedViewsPopoverToggle={setSavedViewsPopoverOpen}
          onOpenSaveViewModal={() => setShowSaveModal(true)}
          lastUpdatedAt={lastUpdatedAt}
          isRefreshing={isRefreshing}
          onRefresh={() => {
            void fetchOverview();
            void fetchThreatReportFeed(feedPageIndex);
            refreshHuntFindings();
          }}
        />
        {data ? (
          <>
            <EuiSpacer size="m" />
            <StatsRibbon stats={data.stats_ribbon} topCategory={data.by_category[0]?.category} />
          </>
        ) : null}
        <EuiSpacer size="m" />
        <EuiTabs data-test-subj="intelligenceHubTabs">
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              isSelected={selectedTab === tab.id}
              data-test-subj={`intelligenceHubTab-${tab.id}`}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="l" />
        {renderTabPanel()}
      </EuiPageTemplate.Section>
      {correlationFlyoutOpen ? (
        <EuiFlyout
          onClose={() => setCorrelationFlyoutOpen(false)}
          size="l"
          aria-labelledby="intelligenceHubCorrelationFlyoutTitle"
          data-test-subj="intelligenceHubCorrelationFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiText size="m">
              <h2 id="intelligenceHubCorrelationFlyoutTitle">
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.correlationFlyoutTitle',
                  { defaultMessage: 'Threat correlation' }
                )}
              </h2>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <CorrelationReportPage
              key={`${correlationReportId ?? 'none'}-${correlationAutoRun}`}
              embedded
              initialReportId={correlationReportId}
              autoRun={correlationAutoRun}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
      {showSaveModal ? (
        <SaveViewModal onCancel={() => setShowSaveModal(false)} onSave={saveCurrentView} />
      ) : null}
      {showScheduleModal ? (
        <ScheduleDeliverModal
          initialTags={filters.categories}
          initialSeverityThreshold={pickSeverityThreshold(filters.severities)}
          onClose={() => setShowScheduleModal(false)}
        />
      ) : null}
    </EuiPageTemplate>
  );
};

const FilterBar: React.FC<{
  filters: IntelligenceHubChipFilters;
  onFiltersChange: (next: IntelligenceHubChipFilters) => void;
  timeRangePreset: TimeRangePresetId;
  onTimeRangePresetChange: (preset: TimeRangePresetId) => void;
  savedViews: SavedViewSummary[];
  activeViewId: string;
  onApplySavedView: (id: string) => void;
  savedViewsLoaded: boolean;
  savedViewsPopoverOpen: boolean;
  onSavedViewsPopoverToggle: (open: boolean) => void;
  onOpenSaveViewModal: () => void;
  lastUpdatedAt: number | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}> = ({
  filters,
  onFiltersChange,
  timeRangePreset,
  onTimeRangePresetChange,
  savedViews,
  activeViewId,
  onApplySavedView,
  savedViewsLoaded,
  savedViewsPopoverOpen,
  onSavedViewsPopoverToggle,
  onOpenSaveViewModal,
  lastUpdatedAt,
  isRefreshing,
  onRefresh,
}) => {
  const { euiTheme } = useEuiTheme();
  const regionOptions = useMemo(() => THREAT_REGIONS.map((r) => ({ label: r, value: r })), []);
  const categoryOptions = useMemo(() => THREAT_CATEGORIES.map((c) => ({ label: c, value: c })), []);
  const timeRangeOptions = useMemo(
    () =>
      TIME_RANGE_PRESET_IDS.map((id) => ({
        id,
        label: timeRangePresetLabel(id),
      })),
    []
  );

  const hasFilters = filters.regions.length > 0 || filters.categories.length > 0;

  const savedViewTriggerLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.savedViewsPopoverLabel',
    { defaultMessage: 'Saved view' }
  );

  const savedViewOptionCss = css({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: euiTheme.colors.text,
    fontSize: euiTheme.size.m,
    lineHeight: 1.4,
    '&:hover': {
      backgroundColor: euiTheme.colors.lightestShade,
    },
  });

  const savedViewActiveOptionCss = css({
    fontWeight: euiTheme.font.weight.semiBold,
  });

  const savedViewsPanelCss = css({
    minWidth: 240,
  });

  const savedViewsPopoverPanelCss = css({
    border: `${euiTheme.border.width.thick} solid ${euiTheme.colors.primary}`,
    borderRadius: euiTheme.border.radius.medium,
  });

  const saveViewFooterCss = css({
    padding: euiTheme.size.s,
  });

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.filterTimeRangeLegend',
                { defaultMessage: 'Time range' }
              )}
              options={timeRangeOptions}
              idSelected={timeRangePreset}
              onChange={(id) => onTimeRangePresetChange(id as TimeRangePresetId)}
              buttonSize="compressed"
              data-test-subj="threatIntelTimeRangeBtnGroup"
            />
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 200 }}>
            <EuiComboBox
              aria-label={i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.filterRegions',
                { defaultMessage: 'Regions' }
              )}
              options={regionOptions}
              selectedOptions={filters.regions.map((r) => ({ label: r, value: r }))}
              onChange={(opts: Array<EuiComboBoxOptionOption<string>>) =>
                onFiltersChange({
                  ...filters,
                  regions: opts.map((o) => o.value as ThreatRegion),
                })
              }
              placeholder={i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.filterRegionsPlaceholder',
                { defaultMessage: 'All regions' }
              )}
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 200 }}>
            <EuiComboBox
              aria-label={i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.filterCategories',
                { defaultMessage: 'Categories' }
              )}
              options={categoryOptions}
              selectedOptions={filters.categories.map((c) => ({ label: c, value: c }))}
              onChange={(opts: Array<EuiComboBoxOptionOption<string>>) =>
                onFiltersChange({
                  ...filters,
                  categories: opts.map((o) => o.value as ThreatCategory),
                })
              }
              placeholder={i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.filterCategoriesPlaceholder',
                { defaultMessage: 'All categories' }
              )}
              compressed
            />
          </EuiFlexItem>
          {hasFilters ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="cross"
                onClick={() => onFiltersChange({ ...filters, regions: [], categories: [] })}
              >
                {i18n.translate('xpack.securitySolution.threatIntelligence.app.filtersClear', {
                  defaultMessage: 'Clear',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="threatIntelLastUpdated">
              {isRefreshing ? (
                i18n.translate('xpack.securitySolution.threatIntelligence.app.refreshingLabel', {
                  defaultMessage: 'Refreshing…',
                })
              ) : lastUpdatedAt ? (
                <>
                  {i18n.translate(
                    'xpack.securitySolution.threatIntelligence.app.lastRefreshedLabel',
                    { defaultMessage: 'Last refreshed' }
                  )}
                  &nbsp;
                  <FormattedRelative value={new Date(lastUpdatedAt)} />
                </>
              ) : null}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="refresh"
              size="s"
              flush="both"
              onClick={onRefresh}
              isLoading={isRefreshing}
              aria-label={i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.refreshAriaLabel',
                { defaultMessage: 'Refresh dashboard' }
              )}
              data-test-subj="threatIntelRefreshBtn"
            >
              {i18n.translate('xpack.securitySolution.threatIntelligence.app.refreshBtn', {
                defaultMessage: 'Refresh',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              isOpen={savedViewsPopoverOpen}
              closePopover={() => onSavedViewsPopoverToggle(false)}
              panelPaddingSize="none"
              anchorPosition="downRight"
              ownFocus
              panelProps={{ css: savedViewsPopoverPanelCss }}
              button={
                <EuiButton
                  size="s"
                  color="text"
                  iconType="arrowDown"
                  iconSide="right"
                  onClick={() => onSavedViewsPopoverToggle(!savedViewsPopoverOpen)}
                  data-test-subj="threatIntelSavedViewsPopoverBtn"
                >
                  {savedViewTriggerLabel}
                </EuiButton>
              }
            >
              <div css={savedViewsPanelCss} data-test-subj="threatIntelSavedViewsPopover">
                {!savedViewsLoaded ? (
                  <div css={css({ padding: euiTheme.size.m })}>
                    <EuiText size="s" color="subdued">
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.filterSavedViewLoading',
                        { defaultMessage: 'Loading…' }
                      )}
                    </EuiText>
                  </div>
                ) : savedViews.length === 0 ? (
                  <div css={css({ padding: euiTheme.size.m })}>
                    <EuiText size="s" color="subdued">
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.savedViewsEmpty',
                        { defaultMessage: 'No saved views yet.' }
                      )}
                    </EuiText>
                  </div>
                ) : (
                  <div role="listbox" aria-label={savedViewTriggerLabel}>
                    {savedViews.map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        role="option"
                        aria-selected={activeViewId === view.id}
                        css={[
                          savedViewOptionCss,
                          activeViewId === view.id ? savedViewActiveOptionCss : undefined,
                        ]}
                        onClick={() => {
                          onApplySavedView(view.id);
                          onSavedViewsPopoverToggle(false);
                        }}
                        data-test-subj={`threatIntelSavedViewOption-${view.id}`}
                      >
                        {view.name}
                      </button>
                    ))}
                  </div>
                )}
                <EuiHorizontalRule margin="none" />
                <div css={saveViewFooterCss}>
                  <EuiButton
                    size="s"
                    fullWidth
                    iconType="save"
                    color="primary"
                    onClick={() => {
                      onSavedViewsPopoverToggle(false);
                      onOpenSaveViewModal();
                    }}
                    data-test-subj="threatIntelSaveViewBtn"
                  >
                    {i18n.translate('xpack.securitySolution.threatIntelligence.app.saveViewBtn', {
                      defaultMessage: 'Save view',
                    })}
                  </EuiButton>
                </div>
              </div>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SaveViewModal: React.FC<{
  onCancel: () => void;
  onSave: (name: string, description?: string) => void;
}> = ({ onCancel, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const canSave = name.trim().length > 0;
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={onCancel} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.saveViewModalTitle', {
            defaultMessage: 'Save current view',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.threatIntelligence.app.saveViewNameLabel', {
            defaultMessage: 'Name',
          })}
        >
          <EuiFieldText
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            data-test-subj="threatIntelSaveViewNameInput"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.saveViewDescriptionLabel',
            {
              defaultMessage: 'Description (optional)',
            }
          )}
        >
          <EuiFieldText
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.saveViewCancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isDisabled={!canSave}
          onClick={() => onSave(name.trim(), description.trim() || undefined)}
          data-test-subj="threatIntelSaveViewSubmitBtn"
        >
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.saveViewSubmit', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

type ScheduleFrequency = 'hourly' | 'daily' | 'weekly';

const RRULE_BY_FREQUENCY: Record<ScheduleFrequency, string> = {
  hourly: 'FREQ=HOURLY',
  daily: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
  weekly: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9',
};

/**
 * Map the dashboard's severity multi-select onto the subscription's
 * single `severity_threshold`. We take the lowest selected severity so
 * the resulting subscription is at least as inclusive as the current
 * dashboard scope; if nothing is selected we fall back to `medium`
 * (matches the `Daily Threat Debrief` built-in template).
 */
const pickSeverityThreshold = (selected: SeverityLevel[]): SeverityLevel => {
  if (selected.length === 0) return 'medium';
  return selected.reduce<SeverityLevel>(
    (acc, current) =>
      SEVERITY_LEVELS.indexOf(current) < SEVERITY_LEVELS.indexOf(acc) ? current : acc,
    selected[0]
  );
};

/**
 * Schedule & deliver modal. Posts directly to the existing subscription
 * route (`SUBMIT_SUBSCRIPTION_API_PATH`) — no per-subscription Kibana
 * Workflow gets created. The subscription mechanism in
 * `services/manage_subscriptions.ts` is the canonical scheduling surface
 * for the threat-intelligence plugin; the per-query workflow the bespoke
 * CISO News prototype creates is intentionally NOT replicated here.
 */
const ScheduleDeliverModal: React.FC<{
  initialTags: ThreatCategory[];
  initialSeverityThreshold: SeverityLevel;
  onClose: () => void;
}> = ({ initialTags, initialSeverityThreshold, onClose }) => {
  const { http, notifications } = useKibana().services;
  const titleId = useGeneratedHtmlId();
  const tagsInputId = useGeneratedHtmlId();

  const [templateId, setTemplateId] = useState<string>('');
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagsDraft, setTagsDraft] = useState<string>(initialTags.join(', '));
  const [severityThreshold, setSeverityThreshold] =
    useState<SeverityLevel>(initialSeverityThreshold);
  const [frequency, setFrequency] = useState<ScheduleFrequency>('daily');
  const [deliveryType, setDeliveryType] = useState<'email' | 'slack'>('email');
  const [deliveryTarget, setDeliveryTarget] = useState('');
  const [connectorId, setConnectorId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const templateOptions = useMemo(
    () => [
      {
        value: '',
        text: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.scheduleTemplateBlank',
          { defaultMessage: '— Custom —' }
        ),
      },
      ...Object.values(SUBSCRIPTION_TEMPLATES).map((template: SubscriptionTemplate) => ({
        value: template.id,
        text: template.name,
      })),
    ],
    []
  );

  const applyTemplate = useCallback((id: string) => {
    setTemplateId(id);
    if (!id) return;
    const template = getSubscriptionTemplate(id);
    if (!template) return;
    setTags(template.tags);
    setTagsDraft(template.tags.join(', '));
    setSeverityThreshold(template.severity_threshold);
    setDeliveryType(template.delivery_type_default);
    if (template.delivery_connector_id_default) {
      setConnectorId(template.delivery_connector_id_default);
    }
    if (/WEEKLY/.test(template.schedule_rrule)) setFrequency('weekly');
    else if (/HOURLY/.test(template.schedule_rrule)) setFrequency('hourly');
    else setFrequency('daily');
  }, []);

  const commitTagsDraft = useCallback(() => {
    const next = tagsDraft
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setTags(next);
  }, [tagsDraft]);

  const canSubmit = tags.length > 0 && deliveryTarget.trim().length > 0 && !submitting;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await http.post<{
        status: string;
        subscription_id: string;
        human_summary: string;
      }>(SUBMIT_SUBSCRIPTION_API_PATH, {
        version: '2023-10-31',
        body: JSON.stringify({
          tags,
          severity_threshold: severityThreshold,
          schedule_rrule: RRULE_BY_FREQUENCY[frequency],
          delivery: {
            type: deliveryType,
            target: deliveryTarget.trim(),
            ...(connectorId.trim() ? { connector_id: connectorId.trim() } : {}),
          },
          ...(templateId ? { template_id: templateId } : {}),
        }),
      });
      notifications.toasts.addSuccess({
        title: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.scheduleSuccessTitle',
          { defaultMessage: 'Subscription scheduled' }
        ),
        text: result.human_summary,
      });
      onClose();
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.scheduleFailureTitle',
          { defaultMessage: 'Failed to schedule subscription' }
        ),
        text:
          (err as { body?: { message?: string }; message?: string }).body?.message ??
          (err as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    http,
    tags,
    severityThreshold,
    frequency,
    deliveryType,
    deliveryTarget,
    connectorId,
    templateId,
    notifications.toasts,
    onClose,
  ]);

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.scheduleDeliverModalTitle',
            { defaultMessage: 'Schedule & deliver' }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.scheduleTemplateLabel',
            { defaultMessage: 'Quick-start template' }
          )}
          helpText={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.scheduleTemplateHelp',
            {
              defaultMessage:
                'Pre-fills tags, severity threshold, frequency, and delivery type from a saved template.',
            }
          )}
        >
          <EuiSelect
            options={templateOptions}
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            data-test-subj="threatIntelScheduleTemplateSelect"
          />
        </EuiFormRow>
        <EuiFormRow
          id={tagsInputId}
          label={i18n.translate('xpack.securitySolution.threatIntelligence.app.scheduleTagsLabel', {
            defaultMessage: 'Tags (comma-separated)',
          })}
          helpText={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.scheduleTagsHelp',
            {
              defaultMessage:
                'The subscription matches reports tagged with any of these keywords. Defaults to the categories currently filtered on the dashboard.',
            }
          )}
        >
          <EuiFieldText
            value={tagsDraft}
            onChange={(e) => setTagsDraft(e.target.value)}
            onBlur={commitTagsDraft}
            data-test-subj="threatIntelScheduleTagsInput"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.scheduleSeverityLabel',
            { defaultMessage: 'Minimum severity' }
          )}
        >
          <EuiSelect
            options={SEVERITY_LEVELS.map((level) => ({ value: level, text: level }))}
            value={severityThreshold}
            onChange={(e) => setSeverityThreshold(e.target.value as SeverityLevel)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.scheduleFrequencyLabel',
            { defaultMessage: 'Frequency' }
          )}
        >
          <EuiSelect
            options={[
              {
                value: 'hourly',
                text: i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.scheduleFrequencyHourly',
                  { defaultMessage: 'Hourly' }
                ),
              },
              {
                value: 'daily',
                text: i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.scheduleFrequencyDaily',
                  { defaultMessage: 'Daily (08:00)' }
                ),
              },
              {
                value: 'weekly',
                text: i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.scheduleFrequencyWeekly',
                  { defaultMessage: 'Weekly (Mon 09:00)' }
                ),
              },
            ]}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.scheduleDeliveryTypeLabel',
            { defaultMessage: 'Delivery channel' }
          )}
        >
          <EuiSelect
            options={[
              {
                value: 'email',
                text: i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.scheduleDeliveryEmail',
                  { defaultMessage: 'Email' }
                ),
              },
              {
                value: 'slack',
                text: i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.scheduleDeliverySlack',
                  { defaultMessage: 'Slack' }
                ),
              },
            ]}
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value as 'email' | 'slack')}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            deliveryType === 'email'
              ? i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.scheduleDeliveryEmailLabel',
                  { defaultMessage: 'Email address' }
                )
              : i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.scheduleDeliverySlackLabel',
                  { defaultMessage: 'Slack channel or user' }
                )
          }
          helpText={
            deliveryType === 'email'
              ? i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.scheduleDeliveryEmailHelp',
                  { defaultMessage: 'e.g. ciso@example.com' }
                )
              : i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.scheduleDeliverySlackHelp',
                  { defaultMessage: 'e.g. #threat-intel or @alice' }
                )
          }
          isInvalid={deliveryTarget.trim().length === 0}
        >
          <EuiFieldText
            value={deliveryTarget}
            onChange={(e) => setDeliveryTarget(e.target.value)}
            isInvalid={deliveryTarget.trim().length === 0}
            data-test-subj="threatIntelScheduleDeliveryTargetInput"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.scheduleConnectorLabel',
            { defaultMessage: 'Connector id (optional)' }
          )}
          helpText={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.scheduleConnectorHelp',
            {
              defaultMessage:
                'Stack Management → Connectors. Leave blank to use the default connector for the channel.',
            }
          )}
        >
          <EuiFieldText
            value={connectorId}
            onChange={(e) => setConnectorId(e.target.value)}
            data-test-subj="threatIntelScheduleConnectorInput"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.scheduleDeliverCancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isDisabled={!canSubmit}
          isLoading={submitting}
          onClick={submit}
          data-test-subj="threatIntelScheduleDeliverSubmitBtn"
        >
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.scheduleDeliverSubmit', {
            defaultMessage: 'Schedule',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
