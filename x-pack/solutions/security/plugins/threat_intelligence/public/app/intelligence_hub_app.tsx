/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
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
  EuiPanel,
  EuiProgress,
  EuiSelect,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import {
  DASHBOARD_OVERVIEW_API_PATH,
  DEFAULT_REGIONS_SETTING_KEY,
  SAVED_VIEWS_API_PATH,
  THREAT_CATEGORIES,
  THREAT_REGIONS,
  type DashboardOverviewResponse,
  type SavedViewSummary,
  type SeverityLevel,
  type ThreatCategory,
  type ThreatRegion,
} from '../../common';

interface Props {
  core: CoreStart;
}

const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  low: 'hollow',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

interface FilterState {
  regions: ThreatRegion[];
  categories: ThreatCategory[];
}

const emptyFilters: FilterState = { regions: [], categories: [] };

export const IntelligenceHubApp: React.FC<Props> = ({ core }) => {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [savedViews, setSavedViews] = useState<SavedViewSummary[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedViewsLoaded, setSavedViewsLoaded] = useState(false);

  // Pre-fill region filter from the per-space advanced setting on first mount.
  useEffect(() => {
    const defaultRegions = (core.uiSettings.get(DEFAULT_REGIONS_SETTING_KEY, []) ??
      []) as ThreatRegion[];
    if (defaultRegions.length > 0) {
      setFilters((prev) => ({ ...prev, regions: defaultRegions }));
    }
  }, [core.uiSettings]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await core.http.get<DashboardOverviewResponse>(DASHBOARD_OVERVIEW_API_PATH, {
        version: '1',
        query: {
          ...(filters.regions.length ? { regions: filters.regions } : {}),
          ...(filters.categories.length ? { categories: filters.categories } : {}),
        },
      });
      setData(response);
    } catch (err) {
      setError(err?.body?.message ?? err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [core.http, filters]);

  const fetchSavedViews = useCallback(async () => {
    try {
      const response = await core.http.get<{ views: SavedViewSummary[] }>(SAVED_VIEWS_API_PATH, {
        version: '1',
      });
      setSavedViews(response.views ?? []);
    } catch {
      // Swallow — saved views are optional. Lack of permissions etc.
      // shouldn't kill the dashboard.
      setSavedViews([]);
    } finally {
      setSavedViewsLoaded(true);
    }
  }, [core.http]);

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
      setFilters({
        regions: found.filters.regions ?? [],
        categories: found.filters.categories ?? [],
      });
    },
    [savedViews]
  );

  const saveCurrentView = useCallback(
    async (name: string, description?: string) => {
      try {
        const created = await core.http.post<SavedViewSummary>(SAVED_VIEWS_API_PATH, {
          version: '1',
          body: JSON.stringify({
            name,
            description,
            filters: {
              ...(filters.regions.length ? { regions: filters.regions } : {}),
              ...(filters.categories.length ? { categories: filters.categories } : {}),
            },
          }),
        });
        setSavedViews((prev) => [created, ...prev]);
        setActiveViewId(created.id);
        setShowSaveModal(false);
      } catch (err) {
        core.notifications.toasts.addDanger({
          title: i18n.translate('xpack.threatIntelligence.app.saveViewFailedTitle', {
            defaultMessage: 'Failed to save view',
          }),
          text:
            (err as { body?: { message?: string }; message?: string }).body?.message ??
            (err as Error).message,
        });
      }
    },
    [core.http, core.notifications.toasts, filters.regions, filters.categories]
  );

  const exportToPdf = useCallback(() => {
    // No hard dependency on the Reporting plugin: trigger the browser's
    // print-to-PDF flow. Reporting integration is intentionally out of
    // scope for v1 because it adds a heavyweight optional plugin
    // dependency; this fallback is good enough for the "Export to PDF"
    // PRD requirement and is easy to swap to `share.url.locators` later.
    window.print();
  }, []);

  const content = useMemo(() => {
    if (loading && !data) {
      return (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={
            <h2>
              {i18n.translate('xpack.threatIntelligence.app.loadingTitle', {
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
          title={i18n.translate('xpack.threatIntelligence.app.errorTitle', {
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

    return <DashboardLayout data={data} />;
  }, [data, error, loading]);

  return (
    <EuiPageTemplate restrictWidth={false} grow={true}>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.threatIntelligence.app.pageTitle', {
          defaultMessage: 'Intelligence Hub',
        })}
        description={
          data
            ? i18n.translate('xpack.threatIntelligence.app.pageDescription', {
                defaultMessage: 'Reports observed in the last {label}.',
                values: { label: data.time_range_label },
              })
            : undefined
        }
        rightSideItems={[
          <EuiButton
            key="export"
            iconType="exportAction"
            color="text"
            onClick={exportToPdf}
            data-test-subj="threatIntelExportPdfBtn"
          >
            {i18n.translate('xpack.threatIntelligence.app.exportPdfBtn', {
              defaultMessage: 'Export to PDF',
            })}
          </EuiButton>,
          <EuiButton
            key="save"
            iconType="save"
            onClick={() => setShowSaveModal(true)}
            data-test-subj="threatIntelSaveViewBtn"
          >
            {i18n.translate('xpack.threatIntelligence.app.saveViewBtn', {
              defaultMessage: 'Save view',
            })}
          </EuiButton>,
        ]}
      />
      <EuiPageTemplate.Section>
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          savedViews={savedViews}
          activeViewId={activeViewId}
          onApplySavedView={applySavedView}
          savedViewsLoaded={savedViewsLoaded}
        />
        <EuiSpacer size="m" />
        {content}
      </EuiPageTemplate.Section>
      {showSaveModal ? (
        <SaveViewModal onCancel={() => setShowSaveModal(false)} onSave={saveCurrentView} />
      ) : null}
    </EuiPageTemplate>
  );
};

const FilterBar: React.FC<{
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  savedViews: SavedViewSummary[];
  activeViewId: string;
  onApplySavedView: (id: string) => void;
  savedViewsLoaded: boolean;
}> = ({
  filters,
  onFiltersChange,
  savedViews,
  activeViewId,
  onApplySavedView,
  savedViewsLoaded,
}) => {
  const regionOptions = useMemo(() => THREAT_REGIONS.map((r) => ({ label: r, value: r })), []);
  const categoryOptions = useMemo(() => THREAT_CATEGORIES.map((c) => ({ label: c, value: c })), []);

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup gutterSize="m" wrap alignItems="flexEnd">
        <EuiFlexItem style={{ minWidth: 240 }}>
          <EuiFormRow
            label={i18n.translate('xpack.threatIntelligence.app.filterRegions', {
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
              placeholder={i18n.translate('xpack.threatIntelligence.app.filterRegionsPlaceholder', {
                defaultMessage: 'All regions',
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 240 }}>
          <EuiFormRow
            label={i18n.translate('xpack.threatIntelligence.app.filterCategories', {
              defaultMessage: 'Categories',
            })}
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
                'xpack.threatIntelligence.app.filterCategoriesPlaceholder',
                {
                  defaultMessage: 'All categories',
                }
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 240 }}>
          <EuiFormRow
            label={i18n.translate('xpack.threatIntelligence.app.filterSavedView', {
              defaultMessage: 'Saved view',
            })}
          >
            <EuiSelect
              options={[
                {
                  value: '',
                  text: savedViewsLoaded
                    ? i18n.translate('xpack.threatIntelligence.app.filterSavedViewBlank', {
                        defaultMessage: '— none —',
                      })
                    : i18n.translate('xpack.threatIntelligence.app.filterSavedViewLoading', {
                        defaultMessage: 'Loading…',
                      }),
                },
                ...savedViews.map((v) => ({ value: v.id, text: v.name })),
              ]}
              value={activeViewId}
              onChange={(e) => onApplySavedView(e.target.value)}
              disabled={!savedViewsLoaded || savedViews.length === 0}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {filters.regions.length > 0 || filters.categories.length > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" iconType="cross" onClick={() => onFiltersChange(emptyFilters)}>
              {i18n.translate('xpack.threatIntelligence.app.filtersClear', {
                defaultMessage: 'Clear',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
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
          {i18n.translate('xpack.threatIntelligence.app.saveViewModalTitle', {
            defaultMessage: 'Save current view',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate('xpack.threatIntelligence.app.saveViewNameLabel', {
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
          label={i18n.translate('xpack.threatIntelligence.app.saveViewDescriptionLabel', {
            defaultMessage: 'Description (optional)',
          })}
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
          {i18n.translate('xpack.threatIntelligence.app.saveViewCancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isDisabled={!canSave}
          onClick={() => onSave(name.trim(), description.trim() || undefined)}
          data-test-subj="threatIntelSaveViewSubmitBtn"
        >
          {i18n.translate('xpack.threatIntelligence.app.saveViewSubmit', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

const DashboardLayout: React.FC<{ data: DashboardOverviewResponse }> = ({ data }) => {
  return (
    <>
      <StatsRibbon stats={data.stats_ribbon} />
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem style={{ minWidth: 360 }}>
          <CategoryBreakdown buckets={data.by_category} />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 360 }}>
          <RegionBreakdown buckets={data.by_region} />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 360 }}>
          <TopTechniques buckets={data.top_techniques} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <SeverityTimeline buckets={data.severity_timeline} />
      <EuiSpacer size="l" />
      <EnvironmentImpact impact={data.environment_impact} />
      <EuiSpacer size="l" />
      <RecentArticles articles={data.recent_articles} />
    </>
  );
};

const StatsRibbon: React.FC<{ stats: DashboardOverviewResponse['stats_ribbon'] }> = ({ stats }) => (
  <EuiFlexGroup gutterSize="m">
    <EuiFlexItem>
      <EuiPanel hasBorder paddingSize="m">
        <EuiStat
          title={stats.total_reports.toLocaleString()}
          description={i18n.translate('xpack.threatIntelligence.app.statTotal', {
            defaultMessage: 'Total reports',
          })}
          titleColor="primary"
        />
      </EuiPanel>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiPanel hasBorder paddingSize="m">
        <EuiStat
          title={stats.critical_reports.toLocaleString()}
          description={i18n.translate('xpack.threatIntelligence.app.statCritical', {
            defaultMessage: 'Critical',
          })}
          titleColor="danger"
        />
      </EuiPanel>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiPanel hasBorder paddingSize="m">
        <EuiStat
          title={stats.high_reports.toLocaleString()}
          description={i18n.translate('xpack.threatIntelligence.app.statHigh', {
            defaultMessage: 'High',
          })}
          titleColor="warning"
        />
      </EuiPanel>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiPanel hasBorder paddingSize="m">
        <EuiStat
          title={stats.affects_you_total.toLocaleString()}
          description={i18n.translate('xpack.threatIntelligence.app.statAffectsYou', {
            defaultMessage: 'Affects you',
          })}
          titleColor="accent"
        />
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
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
        title={i18n.translate('xpack.threatIntelligence.app.categoryTitle', {
          defaultMessage: 'Threat categories',
        })}
        description={i18n.translate('xpack.threatIntelligence.app.categoryDescription', {
          defaultMessage: 'Top reported threat categories',
        })}
      />
      {buckets.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.threatIntelligence.app.emptyState', {
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
      title={i18n.translate('xpack.threatIntelligence.app.regionTitle', {
        defaultMessage: 'Geographic regions',
      })}
      description={i18n.translate('xpack.threatIntelligence.app.regionDescription', {
        defaultMessage: 'Regions mentioned in reports',
      })}
    />
    {buckets.length === 0 ? (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.threatIntelligence.app.emptyState', {
          defaultMessage: 'No data',
        })}
      </EuiText>
    ) : (
      <EuiFlexGroup direction="column" gutterSize="xs">
        {buckets.map((bucket) => (
          <EuiFlexItem key={bucket.region} grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              justifyContent="spaceBetween"
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s">{bucket.region}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                  {bucket.affects_you ? (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="danger">
                        {i18n.translate('xpack.threatIntelligence.app.affectsYouBadge', {
                          defaultMessage: 'Affects you',
                        })}
                      </EuiBadge>
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      {bucket.report_count}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
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
      title={i18n.translate('xpack.threatIntelligence.app.techniquesTitle', {
        defaultMessage: 'Top ATT&CK techniques',
      })}
      description={i18n.translate('xpack.threatIntelligence.app.techniquesDescription', {
        defaultMessage: 'Most frequent techniques extracted from reports',
      })}
    />
    {buckets.length === 0 ? (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.threatIntelligence.app.emptyState', {
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

const SeverityTimeline: React.FC<{ buckets: DashboardOverviewResponse['severity_timeline'] }> = ({
  buckets,
}) => {
  const maxTotal = buckets.reduce(
    (acc, b) => Math.max(acc, b.low + b.medium + b.high + b.critical),
    0
  );
  return (
    <EuiPanel hasBorder paddingSize="m">
      <PanelHeader
        title={i18n.translate('xpack.threatIntelligence.app.timelineTitle', {
          defaultMessage: 'Activity timeline (by severity)',
        })}
      />
      {buckets.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.threatIntelligence.app.emptyState', {
            defaultMessage: 'No data',
          })}
        </EuiText>
      ) : (
        <EuiFlexGroup gutterSize="xs" alignItems="flexEnd" style={{ minHeight: 120 }}>
          {buckets.map((bucket) => {
            const total = bucket.low + bucket.medium + bucket.high + bucket.critical;
            const heightPct = maxTotal === 0 ? 0 : (total / maxTotal) * 100;
            return (
              <EuiFlexItem key={bucket.bucket}>
                <div
                  title={`${bucket.bucket}\nLow: ${bucket.low}\nMedium: ${bucket.medium}\nHigh: ${bucket.high}\nCritical: ${bucket.critical}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    height: 120,
                  }}
                >
                  <div
                    style={{
                      background: 'var(--eui-color-vis2, #54B399)',
                      height: `${(bucket.low / (maxTotal || 1)) * 100}%`,
                    }}
                  />
                  <div
                    style={{
                      background: 'var(--eui-color-vis8, #D6BF57)',
                      height: `${(bucket.medium / (maxTotal || 1)) * 100}%`,
                    }}
                  />
                  <div
                    style={{
                      background: 'var(--eui-color-vis9, #DA8B45)',
                      height: `${(bucket.high / (maxTotal || 1)) * 100}%`,
                    }}
                  />
                  <div
                    style={{
                      background: 'var(--eui-color-danger, #BD271E)',
                      height: `${(bucket.critical / (maxTotal || 1)) * 100}%`,
                    }}
                  />
                  <EuiText
                    size="xs"
                    color="subdued"
                    style={{
                      textAlign: 'center',
                      // Hide axis labels we couldn't fit; tooltip still works.
                      visibility: heightPct === 0 ? 'hidden' : 'visible',
                    }}
                  >
                    {bucket.bucket.slice(5)}
                  </EuiText>
                </div>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

const EnvironmentImpact: React.FC<{
  impact: DashboardOverviewResponse['environment_impact'];
}> = ({ impact }) => (
  <EuiPanel hasBorder paddingSize="m">
    <PanelHeader
      title={i18n.translate('xpack.threatIntelligence.app.envImpactTitle', {
        defaultMessage: 'Environment impact',
      })}
      description={i18n.translate('xpack.threatIntelligence.app.envImpactDescription', {
        defaultMessage:
          'Hits in your environment correlated to advisory IOCs (Layer 1) and ATT&CK techniques (Layer 2).',
      })}
    />
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <EuiStat
          title={impact.total_hits.toLocaleString()}
          description={i18n.translate('xpack.threatIntelligence.app.envHits', {
            defaultMessage: 'Total environment hits',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={impact.layer_1_hits.toLocaleString()}
          description={i18n.translate('xpack.threatIntelligence.app.envL1', {
            defaultMessage: 'Layer 1 (IOC)',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={impact.layer_2_hits.toLocaleString()}
          description={i18n.translate('xpack.threatIntelligence.app.envL2', {
            defaultMessage: 'Layer 2 (ATT&CK)',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    {impact.affected_assets_sample.length > 0 ? (
      <>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.threatIntelligence.app.envAssets', {
            defaultMessage: 'Affected assets (sample): {assets}',
            values: { assets: impact.affected_assets_sample.join(', ') },
          })}
        </EuiText>
      </>
    ) : null}
  </EuiPanel>
);

const RecentArticles: React.FC<{
  articles: DashboardOverviewResponse['recent_articles'];
}> = ({ articles }) => (
  <EuiPanel hasBorder paddingSize="m">
    <PanelHeader
      title={i18n.translate('xpack.threatIntelligence.app.articlesTitle', {
        defaultMessage: 'Recent advisories',
      })}
    />
    {articles.length === 0 ? (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.threatIntelligence.app.emptyState', {
          defaultMessage: 'No data',
        })}
      </EuiText>
    ) : (
      <EuiFlexGroup direction="column" gutterSize="s">
        {articles.map((article) => (
          <EuiFlexItem key={article.report_id} grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color={SEVERITY_COLOR[article.severity] ?? 'default'}>
                  {article.severity}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{article.title || article.report_id}</strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {article.source_name || 'unknown'} · {article['@timestamp']}
                </EuiText>
              </EuiFlexItem>
              {article.environment_hits_total > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger" iconType="dot">
                    {i18n.translate('xpack.threatIntelligence.app.envHitsBadge', {
                      defaultMessage: '{count} env hits',
                      values: { count: article.environment_hits_total },
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    )}
  </EuiPanel>
);
