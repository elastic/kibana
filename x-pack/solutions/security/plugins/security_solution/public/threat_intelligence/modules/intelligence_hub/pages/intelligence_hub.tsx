/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
  EuiPageTemplate,
  EuiPanel,
  EuiProgress,
  EuiSelect,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import {
  DASHBOARD_OVERVIEW_API_PATH,
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
  type SavedViewSummary,
  type SeverityLevel,
  type SubscriptionTemplate,
  type ThreatCategory,
  type ThreatRegion,
  type TimeRangePresetId,
} from '../../../../../common/threat_intelligence/hub';
import { useKibana } from '../../../../common/lib/kibana';

const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  low: 'hollow',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

/**
 * Hex colors for the severity distribution bar / accent slivers / radar
 * shading. EUI vis tokens vary by theme; the dashboard reuses the standard
 * EUI palette so it stays legible in light and dark Amsterdam themes.
 */
const SEVERITY_HEX: Record<SeverityLevel, string> = {
  low: '#54B399',
  medium: '#D6BF57',
  high: '#DA8B45',
  critical: '#BD271E',
};

type ArticleSort = 'relevance' | 'date' | 'severity';

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const isBrowsableArticleUrl = (url: string | undefined): url is string => {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

interface FilterState {
  regions: ThreatRegion[];
  categories: ThreatCategory[];
  /** Severity chips selected in the article-grid filter row. */
  severities: SeverityLevel[];
}

const emptyFilters: FilterState = {
  regions: [],
  categories: [],
  severities: [],
};

const timeRangePresetLabel = (preset: TimeRangePresetId): string => {
  switch (preset) {
    case '24h':
      return i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.timeRange24h',
        { defaultMessage: 'Last 24 hours' }
      );
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
 * intentionally absent until the dashboard read accepts a `q` parameter
 * (or until the article grid is rehosted on `SEARCH_REPORTS_API_PATH`)
 * — a prominent input that only client-side-filters the small
 * `recent_articles` sample is misleading and was removed.
 *
 * `data-test-subj` values (`threatIntelExport*`, `threatIntelSaveView*`)
 * are preserved intentionally so existing functional tests keep
 * targeting the same elements after the move.
 */
export const IntelligenceHubPage: FC = () => {
  const { http, uiSettings, notifications } = useKibana().services;
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [savedViews, setSavedViews] = useState<SavedViewSummary[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [savedViewsLoaded, setSavedViewsLoaded] = useState(false);
  const [sortBy, setSortBy] = useState<ArticleSort>('relevance');
  const [timeRangePreset, setTimeRangePreset] =
    useState<TimeRangePresetId>(DEFAULT_TIME_RANGE_PRESET);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

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
        version: '1',
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

  const fetchSavedViews = useCallback(async () => {
    try {
      const response = await http.get<{ views: SavedViewSummary[] }>(SAVED_VIEWS_API_PATH, {
        version: '1',
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
          version: '1',
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

  const exportToPdf = useCallback(() => {
    // No hard dependency on the Reporting plugin: trigger the browser's
    // print-to-PDF flow. Reporting integration is intentionally out of
    // scope for v1 because it adds a heavyweight optional plugin
    // dependency; this fallback is good enough for the "Export to PDF"
    // PRD requirement and is easy to swap to `share.url.locators` later.
    window.print();
  }, []);

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

  const content = useMemo(() => {
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
      <DashboardLayout
        data={data}
        filters={filters}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onToggleSeverity={toggleSeverity}
        onToggleCategory={toggleCategoryChip}
        onClearChipFilters={clearChipFilters}
      />
    );
  }, [data, error, loading, filters, sortBy, toggleSeverity, toggleCategoryChip, clearChipFilters]);

  // Best-effort source count derived from the response. The server route
  // doesn't return a distinct-sources cardinality today; using the
  // recent_articles sample is a reasonable proxy until a dedicated
  // aggregation is added (`distinct_source_count` on the ribbon contract).
  const sourceCount = useMemo(() => {
    if (!data) return 0;
    return new Set(data.recent_articles.map((a) => a.source_name).filter(Boolean)).size;
  }, [data]);

  return (
    <EuiPageTemplate restrictWidth={false} grow={true}>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.securitySolution.threatIntelligence.app.pageTitle', {
          defaultMessage: 'Intelligence Hub',
        })}
        description={i18n.translate('xpack.securitySolution.threatIntelligence.app.pageDescription', {
          defaultMessage: 'Threat reports from {timeRange}.',
          values: { timeRange: timeRangePresetLabel(timeRangePreset) },
        })}
        rightSideItems={[
          <EuiFlexGroup
            key="refresh"
            gutterSize="s"
            alignItems="center"
            responsive={false}
            wrap={false}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="threatIntelLastUpdated">
                {isRefreshing ? (
                  i18n.translate(
                    'xpack.securitySolution.threatIntelligence.app.refreshingLabel',
                    { defaultMessage: 'Refreshing…' }
                  )
                ) : lastUpdatedAt ? (
                  <>
                    {i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.lastUpdatedLabel',
                      { defaultMessage: 'Updated' }
                    )}
                    &nbsp;
                    <FormattedRelative value={new Date(lastUpdatedAt)} />
                  </>
                ) : null}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="refresh"
                onClick={() => {
                  void fetchOverview();
                }}
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
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
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
            key="export"
            iconType="exportAction"
            color="text"
            onClick={exportToPdf}
            data-test-subj="threatIntelExportPdfBtn"
          >
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.exportPdfBtn', {
              defaultMessage: 'Export to PDF',
            })}
          </EuiButton>,
          <EuiButton
            key="save"
            iconType="save"
            onClick={() => setShowSaveModal(true)}
            data-test-subj="threatIntelSaveViewBtn"
          >
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.saveViewBtn', {
              defaultMessage: 'Save view',
            })}
          </EuiButton>,
        ]}
      />
      <EuiPageTemplate.Section>
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          timeRangePreset={timeRangePreset}
          onTimeRangePresetChange={onTimeRangePresetChange}
          savedViews={savedViews}
          activeViewId={activeViewId}
          onApplySavedView={applySavedView}
          savedViewsLoaded={savedViewsLoaded}
          sourceCount={sourceCount}
        />
        <EuiSpacer size="l" />
        {content}
      </EuiPageTemplate.Section>
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
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  timeRangePreset: TimeRangePresetId;
  onTimeRangePresetChange: (preset: TimeRangePresetId) => void;
  savedViews: SavedViewSummary[];
  activeViewId: string;
  onApplySavedView: (id: string) => void;
  savedViewsLoaded: boolean;
  sourceCount: number;
}> = ({
  filters,
  onFiltersChange,
  timeRangePreset,
  onTimeRangePresetChange,
  savedViews,
  activeViewId,
  onApplySavedView,
  savedViewsLoaded,
  sourceCount,
}) => {
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

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup gutterSize="m" wrap alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.securitySolution.threatIntelligence.app.filterTimeRange', {
              defaultMessage: 'Time range',
            })}
          >
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
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 240 }}>
          <EuiFormRow
            label={i18n.translate('xpack.securitySolution.threatIntelligence.app.filterRegions', {
              defaultMessage: 'Regions',
            })}
          >
            <EuiComboBox
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
                {
                  defaultMessage: 'All regions',
                }
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 240 }}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.filterCategories',
              {
                defaultMessage: 'Categories',
              }
            )}
          >
            <EuiComboBox
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
                {
                  defaultMessage: 'All categories',
                }
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 220 }}>
          <EuiFormRow
            label={i18n.translate('xpack.securitySolution.threatIntelligence.app.filterSavedView', {
              defaultMessage: 'Saved view',
            })}
          >
            <EuiSelect
              options={[
                {
                  value: '',
                  text: savedViewsLoaded
                    ? i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.filterSavedViewBlank',
                        {
                          defaultMessage: '— none —',
                        }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.filterSavedViewLoading',
                        {
                          defaultMessage: 'Loading…',
                        }
                      ),
                },
                ...savedViews.map((v) => ({ value: v.id, text: v.name })),
              ]}
              value={activeViewId}
              onChange={(e) => onApplySavedView(e.target.value)}
              disabled={!savedViewsLoaded || savedViews.length === 0}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {hasFilters ? (
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButtonEmpty
                size="s"
                iconType="cross"
                onClick={() => onFiltersChange({ ...filters, regions: [], categories: [] })}
              >
                {i18n.translate('xpack.securitySolution.threatIntelligence.app.filtersClear', {
                  defaultMessage: 'Clear',
                })}
              </EuiButtonEmpty>
            </EuiFormRow>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.sourceCountTooltip',
              {
                defaultMessage:
                  'Distinct feed sources represented in the most recent articles sample.',
              }
            )}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="online" color="success" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.securitySolution.threatIntelligence.app.sourceCountLabel',
                    {
                      defaultMessage: '{count, plural, one {# source} other {# sources}}',
                      values: { count: sourceCount },
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
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
        version: '1',
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

const DashboardLayout: React.FC<{
  data: DashboardOverviewResponse;
  filters: FilterState;
  sortBy: ArticleSort;
  onSortChange: (next: ArticleSort) => void;
  onToggleSeverity: (severity: SeverityLevel) => void;
  onToggleCategory: (category: ThreatCategory) => void;
  onClearChipFilters: () => void;
}> = ({
  data,
  filters,
  sortBy,
  onSortChange,
  onToggleSeverity,
  onToggleCategory,
  onClearChipFilters,
}) => {
  const topCategory = data.by_category[0]?.category;

  // Severity counts derived from the recent_articles sample so the chip
  // counts reflect the same scope as the article grid below them.
  const severityCounts = useMemo(() => {
    const counts: Record<SeverityLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const article of data.recent_articles) {
      counts[article.severity] = (counts[article.severity] ?? 0) + 1;
    }
    return counts;
  }, [data.recent_articles]);

  const categoryCounts = useMemo(() => {
    const map = new Map<ThreatCategory, number>();
    for (const bucket of data.by_category) {
      if (bucket.category !== '<unknown>') {
        map.set(bucket.category as ThreatCategory, bucket.report_count);
      }
    }
    return map;
  }, [data.by_category]);

  const filteredArticles = useMemo(() => {
    let articles = data.recent_articles;
    if (filters.severities.length > 0) {
      articles = articles.filter((a) => filters.severities.includes(a.severity));
    }
    if (filters.categories.length > 0) {
      articles = articles.filter((a) => a.categories.some((c) => filters.categories.includes(c)));
    }
    if (sortBy === 'date') {
      articles = [...articles].sort((a, b) => b['@timestamp'].localeCompare(a['@timestamp']));
    } else if (sortBy === 'severity') {
      articles = [...articles].sort(
        (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
      );
    }
    return articles;
  }, [data.recent_articles, filters.severities, filters.categories, sortBy]);

  return (
    <>
      <StatsRibbon
        stats={data.stats_ribbon}
        topCategory={topCategory}
        recentArticles={data.recent_articles}
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem style={{ minWidth: 320 }}>
          <ThreatRadar buckets={data.by_category} />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 320 }}>
          <ActivityTimeline buckets={data.severity_timeline} />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 320 }}>
          <CategoryBreakdown buckets={data.by_category} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <ArticleFilterRow
        severityCounts={severityCounts}
        categoryCounts={categoryCounts}
        selectedSeverities={filters.severities}
        selectedCategories={filters.categories}
        onToggleSeverity={onToggleSeverity}
        onToggleCategory={onToggleCategory}
        onClear={onClearChipFilters}
        sortBy={sortBy}
        onSortChange={onSortChange}
        totalShown={filteredArticles.length}
        totalAvailable={data.recent_articles.length}
      />
      <EuiSpacer size="m" />
      <RegionBreakdown buckets={data.by_region} />
      <EuiSpacer size="l" />
      <ArticleGrid articles={filteredArticles} />
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem style={{ minWidth: 360 }}>
          <TopTechniques buckets={data.top_techniques} />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 360 }}>
          <EnvironmentImpact impact={data.environment_impact} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const StatsRibbon: React.FC<{
  stats: DashboardOverviewResponse['stats_ribbon'];
  topCategory?: ThreatCategory | '<unknown>';
  recentArticles: DashboardOverviewResponse['recent_articles'];
}> = ({ stats, topCategory, recentArticles }) => {
  const distinctSources = useMemo(
    () => new Set(recentArticles.map((a) => a.source_name).filter(Boolean)).size,
    [recentArticles]
  );

  const severityTotals = useMemo(() => {
    const totals: Record<SeverityLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const article of recentArticles) {
      totals[article.severity] = (totals[article.severity] ?? 0) + 1;
    }
    return totals;
  }, [recentArticles]);

  return (
    <EuiFlexGroup gutterSize="m" wrap>
      <EuiFlexItem style={{ minWidth: 160 }}>
        <EuiPanel hasBorder paddingSize="m">
          <EuiStat
            title={stats.total_reports.toLocaleString()}
            description={i18n.translate('xpack.securitySolution.threatIntelligence.app.statTotal', {
              defaultMessage: 'Articles',
            })}
            titleColor="primary"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: 160 }}>
        <EuiPanel hasBorder paddingSize="m">
          <EuiStat
            title={stats.critical_reports.toLocaleString()}
            description={i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.statCritical',
              {
                defaultMessage: 'Critical',
              }
            )}
            titleColor="danger"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: 160 }}>
        <EuiPanel hasBorder paddingSize="m">
          <EuiStat
            title={distinctSources.toLocaleString()}
            description={i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.statSources',
              {
                defaultMessage: 'Sources',
              }
            )}
            titleColor="accent"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: 280 }}>
        <SeverityDistributionPanel totals={severityTotals} />
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: 200 }}>
        <TopThreatPanel topCategory={topCategory} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SeverityDistributionPanel: React.FC<{ totals: Record<SeverityLevel, number> }> = ({
  totals,
}) => {
  const { euiTheme } = useEuiTheme();
  const sum = SEVERITY_LEVELS.reduce((acc, s) => acc + totals[s], 0) || 1;
  const segments = SEVERITY_LEVELS.filter((s) => totals[s] > 0)
    .reverse()
    .map((severity) => ({
      severity,
      count: totals[severity],
      widthPct: (totals[severity] / sum) * 100,
    }));

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.securitySolution.threatIntelligence.app.severityDistributionLabel', {
          defaultMessage: 'Severity distribution',
        })}
      </EuiText>
      <EuiSpacer size="xs" />
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: 22,
          borderRadius: 4,
          overflow: 'hidden',
          background: euiTheme.colors.emptyShade,
        }}
        role="img"
        aria-label={segments
          .map((s) =>
            i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.severityDistributionAriaSegment',
              {
                defaultMessage: '{severity}: {count}',
                values: { severity: s.severity, count: s.count },
              }
            )
          )
          .join(', ')}
      >
        {segments.map((segment) => (
          <div
            key={segment.severity}
            title={`${segment.severity}: ${segment.count}`}
            style={{
              width: `${segment.widthPct}%`,
              background: SEVERITY_HEX[segment.severity],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: euiTheme.colors.plainLight,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {segment.count}
          </div>
        ))}
      </div>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        {SEVERITY_LEVELS.slice()
          .reverse()
          .filter((s) => totals[s] > 0)
          .map((s) => (
            <EuiFlexItem key={s} grow={false}>
              <EuiText size="xs">
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginRight: 6,
                    background: SEVERITY_HEX[s],
                  }}
                />
                {`${totals[s]} ${s}`}
              </EuiText>
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const TopThreatPanel: React.FC<{ topCategory?: ThreatCategory | '<unknown>' }> = ({
  topCategory,
}) => (
  <EuiPanel hasBorder paddingSize="m">
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="securityApp" size="l" color="danger" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.topThreatLabel', {
            defaultMessage: 'Top threat',
          })}
        </EuiText>
        <EuiTitle size="xs">
          <h3>
            {topCategory && topCategory !== '<unknown>'
              ? topCategory
              : i18n.translate('xpack.securitySolution.threatIntelligence.app.topThreatUnknown', {
                  defaultMessage: 'No clear leader',
                })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const PanelHeader: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <>
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
    {description ? (
      <EuiText size="xs" color="subdued">
        {description}
      </EuiText>
    ) : null}
    <EuiHorizontalRule margin="s" />
  </>
);

const CategoryBreakdown: React.FC<{ buckets: DashboardOverviewResponse['by_category'] }> = ({
  buckets,
}) => {
  const max = buckets[0]?.report_count ?? 0;
  return (
    <EuiPanel hasBorder paddingSize="m">
      <PanelHeader
        title={i18n.translate('xpack.securitySolution.threatIntelligence.app.categoryTitle', {
          defaultMessage: 'Categories',
        })}
        description={i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.categoryDescription',
          {
            defaultMessage: 'Top reported threat categories',
          }
        )}
      />
      {buckets.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.emptyState', {
            defaultMessage: 'No data',
          })}
        </EuiText>
      ) : (
        buckets.map((bucket) => (
          <div key={bucket.category} style={{ marginBottom: 8 }}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiText size="s">{bucket.category}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {bucket.report_count}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiProgress value={bucket.report_count} max={max || 1} size="xs" color="primary" />
          </div>
        ))
      )}
    </EuiPanel>
  );
};

const RegionBreakdown: React.FC<{ buckets: DashboardOverviewResponse['by_region'] }> = ({
  buckets,
}) => (
  <EuiPanel hasBorder paddingSize="m">
    <PanelHeader
      title={i18n.translate('xpack.securitySolution.threatIntelligence.app.regionTitle', {
        defaultMessage: 'Geographic regions',
      })}
      description={i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.regionDescription',
        {
          defaultMessage: 'Regions mentioned in reports',
        }
      )}
    />
    {buckets.length === 0 ? (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.securitySolution.threatIntelligence.app.emptyState', {
          defaultMessage: 'No data',
        })}
      </EuiText>
    ) : (
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        {buckets.map((bucket) => (
          <EuiFlexItem key={bucket.region} grow={false}>
            <EuiPanel hasBorder paddingSize="s">
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{bucket.region}</EuiText>
                </EuiFlexItem>
                {bucket.affects_you ? (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="danger">
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.affectsYouBadge',
                        {
                          defaultMessage: 'Affects you',
                        }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {bucket.report_count}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    )}
  </EuiPanel>
);

const TopTechniques: React.FC<{ buckets: DashboardOverviewResponse['top_techniques'] }> = ({
  buckets,
}) => (
  <EuiPanel hasBorder paddingSize="m">
    <PanelHeader
      title={i18n.translate('xpack.securitySolution.threatIntelligence.app.techniquesTitle', {
        defaultMessage: 'Top ATT&CK techniques',
      })}
      description={i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.techniquesDescription',
        {
          defaultMessage: 'Most frequent techniques extracted from reports',
        }
      )}
    />
    {buckets.length === 0 ? (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.securitySolution.threatIntelligence.app.emptyState', {
          defaultMessage: 'No data',
        })}
      </EuiText>
    ) : (
      <EuiFlexGroup direction="column" gutterSize="xs">
        {buckets.map((bucket) => (
          <EuiFlexItem key={bucket.technique_id} grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              justifyContent="spaceBetween"
            >
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{bucket.technique_id}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {bucket.report_count}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    )}
  </EuiPanel>
);

/**
 * Lightweight SVG radar of the top threat categories. The previous bar
 * chart implementation lives below as `CategoryBreakdown`; this radar
 * complements it (categories as axes, magnitude as polygon distance) to
 * give the dashboard the "Threat Radar" panel the bespoke prototype had.
 */
const ThreatRadar: React.FC<{ buckets: DashboardOverviewResponse['by_category'] }> = ({
  buckets,
}) => {
  const radarBuckets = useMemo(
    () => buckets.filter((b) => b.category !== '<unknown>').slice(0, 8),
    [buckets]
  );
  const max = radarBuckets[0]?.report_count ?? 0;
  const size = 260;
  const center = size / 2;
  const radius = size / 2 - 36;
  const ringCount = 4;

  const points = radarBuckets.map((bucket, idx) => {
    const angle = (Math.PI * 2 * idx) / radarBuckets.length - Math.PI / 2;
    const magnitude = max > 0 ? bucket.report_count / max : 0;
    const x = center + Math.cos(angle) * radius * magnitude;
    const y = center + Math.sin(angle) * radius * magnitude;
    const labelX = center + Math.cos(angle) * (radius + 18);
    const labelY = center + Math.sin(angle) * (radius + 18);
    return {
      category: bucket.category,
      count: bucket.report_count,
      angle,
      x,
      y,
      labelX,
      labelY,
    };
  });

  return (
    <EuiPanel hasBorder paddingSize="m">
      <PanelHeader
        title={i18n.translate('xpack.securitySolution.threatIntelligence.app.threatRadarTitle', {
          defaultMessage: 'Threat radar',
        })}
        description={i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.threatRadarDescription',
          {
            defaultMessage: 'Category magnitude across the current filter set',
          }
        )}
      />
      {radarBuckets.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.emptyState', {
            defaultMessage: 'No data',
          })}
        </EuiText>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.threatRadarAriaLabel',
              {
                defaultMessage: 'Threat radar chart',
              }
            )}
          >
            {Array.from({ length: ringCount }, (_, ringIdx) => {
              const r = (radius * (ringIdx + 1)) / ringCount;
              return (
                <circle
                  key={`ring-${ringIdx}`}
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke="var(--eui-color-lightShade, #404040)"
                  strokeWidth={1}
                />
              );
            })}
            {points.map((point) => {
              const axisX = center + Math.cos(point.angle) * radius;
              const axisY = center + Math.sin(point.angle) * radius;
              return (
                <line
                  key={`axis-${point.category}`}
                  x1={center}
                  y1={center}
                  x2={axisX}
                  y2={axisY}
                  stroke="var(--eui-color-lightShade, #404040)"
                  strokeWidth={1}
                />
              );
            })}
            <polygon
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="rgba(0, 119, 204, 0.25)"
              stroke="var(--eui-color-primary, #0077CC)"
              strokeWidth={2}
            />
            {points.map((point) => (
              <circle
                key={`dot-${point.category}`}
                cx={point.x}
                cy={point.y}
                r={3}
                fill="var(--eui-color-primary, #0077CC)"
              >
                <title>{`${point.category}: ${point.count}`}</title>
              </circle>
            ))}
            {points.map((point) => (
              <text
                key={`label-${point.category}`}
                x={point.labelX}
                y={point.labelY}
                fontSize={10}
                fill="var(--eui-color-darkShade, #98a2b3)"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {point.category}
              </text>
            ))}
          </svg>
        </div>
      )}
    </EuiPanel>
  );
};

/**
 * Scatter-style activity timeline. Each timeline bucket gets a column;
 * within the column each severity row gets a single dot sized
 * proportionally to that severity's article count for the bucket. Keeps
 * the temporal-density-by-severity story the bespoke prototype's
 * scatter view conveys without bringing in a charting dependency.
 */
const ActivityTimeline: React.FC<{
  buckets: DashboardOverviewResponse['severity_timeline'];
}> = ({ buckets }) => {
  const { euiTheme } = useEuiTheme();
  const rowOrder: SeverityLevel[] = ['critical', 'high', 'medium', 'low'];
  const maxCount = useMemo(() => {
    let max = 0;
    for (const bucket of buckets) {
      for (const severity of rowOrder) {
        if (bucket[severity] > max) max = bucket[severity];
      }
    }
    return max;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets]);

  return (
    <EuiPanel hasBorder paddingSize="m">
      <PanelHeader
        title={i18n.translate('xpack.securitySolution.threatIntelligence.app.timelineTitle', {
          defaultMessage: 'Activity timeline',
        })}
        description={i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.timelineDescription',
          {
            defaultMessage: 'Articles per bucket, plotted by severity',
          }
        )}
      />
      {buckets.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.emptyState', {
            defaultMessage: 'No data',
          })}
        </EuiText>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: 10,
              color: euiTheme.colors.darkShade,
              height: 140,
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            {rowOrder.map((severity) => (
              <span key={`label-${severity}`}>{severity.toUpperCase()}</span>
            ))}
          </div>
          <div style={{ flex: 1, position: 'relative', height: 140 }}>
            <EuiFlexGroup gutterSize="xs" responsive={false} style={{ height: '100%' }}>
              {buckets.map((bucket) => (
                <EuiFlexItem key={bucket.bucket}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateRows: `repeat(${rowOrder.length}, 1fr)`,
                      height: '100%',
                      position: 'relative',
                    }}
                    title={`${bucket.bucket}\nCritical: ${bucket.critical}\nHigh: ${bucket.high}\nMedium: ${bucket.medium}\nLow: ${bucket.low}`}
                  >
                    {rowOrder.map((severity) => {
                      const count = bucket[severity];
                      if (count === 0) {
                        return <div key={`${bucket.bucket}-${severity}`} />;
                      }
                      const ratio = maxCount === 0 ? 0 : count / maxCount;
                      const diameter = 4 + Math.round(ratio * 10);
                      return (
                        <div
                          key={`${bucket.bucket}-${severity}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            style={{
                              width: diameter,
                              height: diameter,
                              borderRadius: '50%',
                              background: SEVERITY_HEX[severity],
                              boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiFlexGroup
              gutterSize="xs"
              responsive={false}
              style={{ marginTop: 6, fontSize: 10, color: euiTheme.colors.darkShade }}
            >
              {buckets.map((bucket, idx) => (
                <EuiFlexItem key={`xlabel-${bucket.bucket}`}>
                  <span style={{ textAlign: 'center' }}>
                    {idx === 0
                      ? i18n.translate(
                          'xpack.securitySolution.threatIntelligence.app.timelineFirstBucket',
                          { defaultMessage: 'Oldest' }
                        )
                      : idx === buckets.length - 1
                      ? i18n.translate(
                          'xpack.securitySolution.threatIntelligence.app.timelineLastBucket',
                          { defaultMessage: 'Now' }
                        )
                      : ''}
                  </span>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>
        </div>
      )}
    </EuiPanel>
  );
};

const ArticleFilterRow: React.FC<{
  severityCounts: Record<SeverityLevel, number>;
  categoryCounts: Map<ThreatCategory, number>;
  selectedSeverities: SeverityLevel[];
  selectedCategories: ThreatCategory[];
  onToggleSeverity: (severity: SeverityLevel) => void;
  onToggleCategory: (category: ThreatCategory) => void;
  onClear: () => void;
  sortBy: ArticleSort;
  onSortChange: (next: ArticleSort) => void;
  totalShown: number;
  totalAvailable: number;
}> = ({
  severityCounts,
  categoryCounts,
  selectedSeverities,
  selectedCategories,
  onToggleSeverity,
  onToggleCategory,
  onClear,
  sortBy,
  onSortChange,
  totalShown,
  totalAvailable,
}) => {
  const sortOptions = useMemo(
    () => [
      {
        id: 'relevance',
        label: i18n.translate('xpack.securitySolution.threatIntelligence.app.sortRelevance', {
          defaultMessage: 'Relevance',
        }),
      },
      {
        id: 'date',
        label: i18n.translate('xpack.securitySolution.threatIntelligence.app.sortDate', {
          defaultMessage: 'Date',
        }),
      },
      {
        id: 'severity',
        label: i18n.translate('xpack.securitySolution.threatIntelligence.app.sortSeverity', {
          defaultMessage: 'Severity',
        }),
      },
    ],
    []
  );

  const visibleCategories = useMemo(
    () =>
      Array.from(categoryCounts.entries())
        .filter(([, count]) => count > 0)
        .slice(0, 8),
    [categoryCounts]
  );

  const hasAnyFilter = selectedSeverities.length > 0 || selectedCategories.length > 0;

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup gutterSize="m" wrap alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" wrap alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.articleFilterLabel',
                  {
                    defaultMessage: 'Filter:',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
            {SEVERITY_LEVELS.slice()
              .reverse()
              .map((severity) => {
                const count = severityCounts[severity];
                if (count === 0) return null;
                const isSelected = selectedSeverities.includes(severity);
                return (
                  <EuiFlexItem key={`severity-chip-${severity}`} grow={false}>
                    <EuiBadge
                      color={isSelected ? SEVERITY_HEX[severity] : 'hollow'}
                      onClick={() => onToggleSeverity(severity)}
                      onClickAriaLabel={i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.severityChipAria',
                        {
                          defaultMessage: 'Toggle {severity} severity filter',
                          values: { severity },
                        }
                      )}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          marginRight: 6,
                          background: SEVERITY_HEX[severity],
                        }}
                      />
                      {`${severity} (${count})`}
                    </EuiBadge>
                  </EuiFlexItem>
                );
              })}
            {visibleCategories.map(([category, count]) => {
              const isSelected = selectedCategories.includes(category);
              return (
                <EuiFlexItem key={`category-chip-${category}`} grow={false}>
                  <EuiBadge
                    color={isSelected ? 'primary' : 'hollow'}
                    onClick={() => onToggleCategory(category)}
                    onClickAriaLabel={i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.categoryChipAria',
                      {
                        defaultMessage: 'Toggle {category} category filter',
                        values: { category },
                      }
                    )}
                  >
                    {`${category} (${count})`}
                  </EuiBadge>
                </EuiFlexItem>
              );
            })}
            {hasAnyFilter ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="xs" iconType="cross" onClick={onClear}>
                  {i18n.translate(
                    'xpack.securitySolution.threatIntelligence.app.articleFilterClear',
                    {
                      defaultMessage: 'Clear',
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend={i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.sortToggleLegend',
                  {
                    defaultMessage: 'Sort articles by',
                  }
                )}
                options={sortOptions}
                idSelected={sortBy}
                onChange={(id) => onSortChange(id as ArticleSort)}
                buttonSize="compressed"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.securitySolution.threatIntelligence.app.articleCountLabel', {
                  defaultMessage: '{shown} of {total}',
                  values: { shown: totalShown, total: totalAvailable },
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const ArticleGrid: React.FC<{
  articles: DashboardOverviewResponse['recent_articles'];
}> = ({ articles }) => {
  if (articles.length === 0) {
    return (
      <EuiPanel hasBorder paddingSize="m">
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.articleGridEmpty', {
            defaultMessage: 'No articles match the current filter set.',
          })}
        </EuiText>
      </EuiPanel>
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 12,
      }}
    >
      {articles.map((article) => (
        <ArticleCard key={article.report_id} article={article} />
      ))}
    </div>
  );
};

const ArticleCard: React.FC<{
  article: DashboardOverviewResponse['recent_articles'][number];
}> = ({ article }) => {
  const displayTitle = article.title || article.report_id;
  const articleUrl = isBrowsableArticleUrl(article.source_url) ? article.source_url : undefined;

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      style={{
        borderLeft: `4px solid ${SEVERITY_HEX[article.severity]}`,
      }}
    >
      <EuiText size="s">
        {articleUrl ? (
          <EuiLink
            href={articleUrl}
            target="_blank"
            external
            data-test-subj={`threatIntelArticleLink-${article.report_id}`}
          >
            <strong>{displayTitle}</strong>
          </EuiLink>
        ) : (
          <strong>{displayTitle}</strong>
        )}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color={SEVERITY_COLOR[article.severity]}>{article.severity}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {article.source_name || 'unknown'}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {article['@timestamp']}
          </EuiText>
        </EuiFlexItem>
        {article.environment_hits_total > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="danger" iconType="dot">
              {i18n.translate('xpack.securitySolution.threatIntelligence.app.envHitsBadge', {
                defaultMessage: '{count} env hits',
                values: { count: article.environment_hits_total },
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {article.categories.length > 0 ? (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {article.categories.slice(0, 3).map((category) => (
              <EuiFlexItem key={`${article.report_id}-cat-${category}`} grow={false}>
                <EuiBadge color="hollow">{category}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      ) : null}
    </EuiPanel>
  );
};

const EnvironmentImpact: React.FC<{
  impact: DashboardOverviewResponse['environment_impact'];
}> = ({ impact }) => (
  <EuiPanel hasBorder paddingSize="m">
    <PanelHeader
      title={i18n.translate('xpack.securitySolution.threatIntelligence.app.envImpactTitle', {
        defaultMessage: 'Environment impact',
      })}
      description={i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.envImpactDescription',
        {
          defaultMessage:
            'Hits in your environment correlated to advisory IOCs (Layer 1) and ATT&CK techniques (Layer 2).',
        }
      )}
    />
    <EuiFlexGroup gutterSize="m" wrap>
      <EuiFlexItem>
        <EuiStat
          title={impact.total_hits.toLocaleString()}
          description={i18n.translate('xpack.securitySolution.threatIntelligence.app.envHits', {
            defaultMessage: 'Total environment hits',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={impact.layer_1_hits.toLocaleString()}
          description={i18n.translate('xpack.securitySolution.threatIntelligence.app.envL1', {
            defaultMessage: 'Layer 1 (IOC)',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={impact.layer_2_hits.toLocaleString()}
          description={i18n.translate('xpack.securitySolution.threatIntelligence.app.envL2', {
            defaultMessage: 'Layer 2 (ATT&CK)',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    {impact.affected_assets_sample.length > 0 ? (
      <>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.envAssets', {
            defaultMessage: 'Affected assets (sample): {assets}',
            values: { assets: impact.affected_assets_sample.join(', ') },
          })}
        </EuiText>
      </>
    ) : null}
  </EuiPanel>
);
