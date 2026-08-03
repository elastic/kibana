/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import {
  SEVERITY_LEVELS,
  percentChangeVsPrior,
  type DashboardOverviewResponse,
  type SeverityLevel,
  type ThreatCategory,
  type ThreatRegion,
} from '../../../../../common/threat_intelligence/hub';
import {
  SEVERITY_HEX,
  ThreatReportFeed,
  fromDashboardArticle,
  type ReportFeedSort,
  type ThreatReportFeedItem,
  type ThreatReportFeedPagination,
} from '../../../components/report_feed';
import { getMitreTechniqueMetadata } from '../mitre_technique_metadata';
import { ExecutiveAdvisoryPanel } from './executive_advisory_panel';

export interface IntelligenceHubChipFilters {
  regions: ThreatRegion[];
  categories: ThreatCategory[];
  severities: SeverityLevel[];
}

export const IntelligenceHubDashboardView: React.FC<{
  data: DashboardOverviewResponse;
  /**
   * Paginated feed from `find_threat_reports`. When omitted (Agent Builder
   * canvas), falls back to overview `recent_articles` with client-side filter.
   */
  feedItems?: ThreatReportFeedItem[];
  feedPagination?: ThreatReportFeedPagination;
  isLoadingFeed?: boolean;
  filters: IntelligenceHubChipFilters;
  sortBy: ReportFeedSort;
  onSortChange: (next: ReportFeedSort) => void;
  onToggleSeverity: (severity: SeverityLevel) => void;
  onToggleCategory: (category: ThreatCategory) => void;
  onClearChipFilters: () => void;
  highlightReportId?: string;
  onHighlightReport: (reportId: string) => void;
  isGeneratingAdvisory?: boolean;
  onGenerateAdvisory?: () => void;
  onFocusSourceReports?: () => void;
  onCorrelateReport?: (reportId: string) => void;
}> = ({
  data,
  feedItems: feedItemsProp,
  feedPagination,
  isLoadingFeed = false,
  filters,
  sortBy,
  onSortChange,
  onToggleSeverity,
  onToggleCategory,
  onClearChipFilters,
  highlightReportId,
  onHighlightReport,
  isGeneratingAdvisory = false,
  onGenerateAdvisory = () => undefined,
  onFocusSourceReports = () => undefined,
  onCorrelateReport,
}) => {
  const { euiTheme } = useEuiTheme();
  const categoryCounts = useMemo(() => {
    const map = new Map<ThreatCategory, number>();
    for (const bucket of data.by_category) {
      if (bucket.category !== '<unknown>') {
        map.set(bucket.category as ThreatCategory, bucket.report_count);
      }
    }
    return map;
  }, [data.by_category]);

  const severityCounts = useMemo(
    (): Record<SeverityLevel, number> => ({
      critical: data.stats_ribbon.critical_reports,
      high: data.stats_ribbon.high_reports,
      medium: data.stats_ribbon.medium_reports,
      low: data.stats_ribbon.low_reports,
    }),
    [
      data.stats_ribbon.critical_reports,
      data.stats_ribbon.high_reports,
      data.stats_ribbon.low_reports,
      data.stats_ribbon.medium_reports,
    ]
  );

  const fallbackFeedItems = useMemo(
    () => data.recent_articles.map(fromDashboardArticle),
    [data.recent_articles]
  );
  const serverDriven = feedItemsProp !== undefined;
  const feedItems = feedItemsProp ?? fallbackFeedItems;

  /**
   * One grid for all six overview charts so 2-column mode is always
   * 1 2 / 3 4 / 5 6 (two separate flex rows used to leave a full-width orphan).
   * auto-fit collapses to 3 → 2 → 1 columns from container width.
   */
  const overviewChartsGridCss = useMemo(
    () =>
      css({
        display: 'grid',
        gap: euiTheme.size.l,
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        alignItems: 'stretch',
        '> *': {
          minWidth: 0,
        },
      }),
    [euiTheme.size.l]
  );

  return (
    <>
      <ExecutiveAdvisoryPanel
        advisory={data.latest_advisory}
        isGenerating={isGeneratingAdvisory}
        onGenerateSummary={onGenerateAdvisory}
        onHighlightReport={onHighlightReport}
        onFocusSourceReports={onFocusSourceReports}
      />
      <EuiSpacer size="l" />
      <div css={overviewChartsGridCss} data-test-subj="threatIntelOverviewChartsGrid">
        <ThreatRadar buckets={data.by_category} />
        <ActivityTimeline buckets={data.severity_timeline} timeRangeLabel={data.time_range_label} />
        <CategoryBreakdown buckets={data.by_category} />
        <RegionBreakdown buckets={data.by_region} />
        <TopTechniques buckets={data.top_techniques} coverageSummary={data.coverage_summary} />
        <EnvironmentImpact
          impact={data.environment_impact}
          totalReports={data.stats_ribbon.total_reports}
          onHighlightReport={onHighlightReport}
        />
      </div>
      <EuiSpacer size="l" />
      <div id="threat-intel-report-feed" data-test-subj="threatIntelReportFeedSection">
        <ThreatReportFeed
          items={feedItems}
          serverDriven={serverDriven}
          isLoading={isLoadingFeed}
          severityCounts={severityCounts}
          categoryCounts={categoryCounts}
          pagination={feedPagination}
          highlightReportId={highlightReportId}
          selectedSeverities={filters.severities}
          selectedCategories={filters.categories}
          onToggleSeverity={onToggleSeverity}
          onToggleCategory={onToggleCategory}
          onClearFilters={onClearChipFilters}
          sortBy={sortBy}
          onSortChange={onSortChange}
          onCorrelate={onCorrelateReport}
        />
      </div>
    </>
  );
};

/** Shared card heading so all five ribbon panels match size/color. */
const StatCardHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText size="s">
      <p css={{ marginBottom: 0, color: euiTheme.colors.textParagraph }}>{children}</p>
    </EuiText>
  );
};

const STAT_CARD_MIN_WIDTH_PX = 168;

const statsRibbonCardItemCss = css({
  flex: `1 1 ${STAT_CARD_MIN_WIDTH_PX}px`,
  minWidth: STAT_CARD_MIN_WIDTH_PX,
  maxWidth: '100%',
});

const PriorPeriodStat: React.FC<{ current: number; prior: number }> = ({ current, prior }) => {
  const { euiTheme } = useEuiTheme();
  const percent = percentChangeVsPrior(current, prior);
  const direction = percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat';
  const iconType =
    direction === 'up' ? 'arrowUp' : direction === 'down' ? 'arrowDown' : 'arrowRight';
  const color =
    direction === 'up'
      ? euiTheme.colors.success
      : direction === 'down'
      ? euiTheme.colors.danger
      : euiTheme.colors.textSubdued;

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      wrap={false}
      css={{ flexWrap: 'nowrap' }}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} color={color} size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" css={{ color, whiteSpace: 'nowrap' }}>
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.statVsPriorPeriod', {
            defaultMessage: '{percent}% vs prior period',
            values: { percent: Math.abs(percent) },
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const NumericStatCard: React.FC<{
  heading: string;
  value: string;
  current: number;
  prior: number;
  /** When set, value is this color only if `current > 0`; otherwise black. */
  emphasizeWhenPositive?: string;
}> = ({ heading, value, current, prior, emphasizeWhenPositive }) => {
  const { euiTheme } = useEuiTheme();
  const valueColor =
    emphasizeWhenPositive && current > 0 ? emphasizeWhenPositive : euiTheme.colors.textParagraph;

  return (
    <EuiPanel hasBorder paddingSize="m" css={{ height: '100%' }}>
      <StatCardHeading>{heading}</StatCardHeading>
      <EuiSpacer size="xs" />
      <EuiTitle size="m" css={{ color: valueColor, '& > *': { color: 'inherit' } }}>
        <p css={{ marginBottom: 0 }}>{value}</p>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <PriorPeriodStat current={current} prior={prior} />
    </EuiPanel>
  );
};

export const StatsRibbon: React.FC<{
  stats: DashboardOverviewResponse['stats_ribbon'];
  topCategory?: ThreatCategory | '<unknown>';
}> = ({ stats, topCategory }) => {
  const severityTotals = useMemo(
    (): Record<SeverityLevel, number> => ({
      critical: stats.critical_reports,
      high: stats.high_reports,
      medium: stats.medium_reports,
      low: stats.low_reports,
    }),
    [stats.critical_reports, stats.high_reports, stats.low_reports, stats.medium_reports]
  );

  return (
    <EuiFlexGroup gutterSize="m" wrap responsive>
      <EuiFlexItem grow css={statsRibbonCardItemCss}>
        <NumericStatCard
          heading={i18n.translate('xpack.securitySolution.threatIntelligence.app.statTotal', {
            defaultMessage: 'Articles',
          })}
          value={stats.total_reports.toLocaleString()}
          current={stats.total_reports}
          prior={stats.total_reports_prior}
        />
      </EuiFlexItem>
      <EuiFlexItem grow css={statsRibbonCardItemCss}>
        <NumericStatCard
          heading={i18n.translate('xpack.securitySolution.threatIntelligence.app.statCritical', {
            defaultMessage: 'Critical',
          })}
          value={stats.critical_reports.toLocaleString()}
          current={stats.critical_reports}
          prior={stats.critical_reports_prior}
          emphasizeWhenPositive={SEVERITY_HEX.critical}
        />
      </EuiFlexItem>
      <EuiFlexItem grow css={statsRibbonCardItemCss}>
        <NumericStatCard
          heading={i18n.translate('xpack.securitySolution.threatIntelligence.app.statSources', {
            defaultMessage: 'Sources',
          })}
          value={stats.distinct_source_count.toLocaleString()}
          current={stats.distinct_source_count}
          prior={stats.distinct_source_count_prior}
        />
      </EuiFlexItem>
      <EuiFlexItem grow css={statsRibbonCardItemCss}>
        <SeverityDistributionPanel totals={severityTotals} />
      </EuiFlexItem>
      <EuiFlexItem grow css={statsRibbonCardItemCss}>
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
    <EuiPanel hasBorder paddingSize="m" css={{ height: '100%' }}>
      <StatCardHeading>
        {i18n.translate('xpack.securitySolution.threatIntelligence.app.severityDistributionLabel', {
          defaultMessage: 'Severity distribution',
        })}
      </StatCardHeading>
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
          .map((s) => (
            <EuiFlexItem key={s} grow={false}>
              <EuiText size="xs" color={totals[s] > 0 ? undefined : 'subdued'}>
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
  <EuiPanel hasBorder paddingSize="m" css={{ height: '100%' }}>
    <StatCardHeading>
      {i18n.translate('xpack.securitySolution.threatIntelligence.app.topThreatLabel', {
        defaultMessage: 'Top threat',
      })}
    </StatCardHeading>
    <EuiSpacer size="xs" />
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="securityApp" size="l" color="danger" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem css={{ minWidth: 0 }}>
        <EuiTitle size="xs">
          <h3
            css={{
              marginBottom: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
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

/** Matches ThreatRadar SVG height so the overview chart panels align. */
const OVERVIEW_PANEL_CONTENT_HEIGHT = 260;

const overviewChartPanelStyle: React.CSSProperties = {
  minHeight: OVERVIEW_PANEL_CONTENT_HEIGHT + 88,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};

const PanelHeader: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <>
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
    {description ? (
      <>
        <EuiText size="xs" color="subdued">
          {description}
        </EuiText>
        <EuiSpacer size="s" />
      </>
    ) : (
      <EuiSpacer size="s" />
    )}
  </>
);

const CategoryBreakdown: React.FC<{ buckets: DashboardOverviewResponse['by_category'] }> = ({
  buckets,
}) => {
  const max = buckets[0]?.report_count ?? 0;
  return (
    <EuiPanel hasBorder paddingSize="m" style={overviewChartPanelStyle}>
      <PanelHeader
        title={i18n.translate('xpack.securitySolution.threatIntelligence.app.categoryTitle', {
          defaultMessage: 'Categories',
        })}
      />
      {buckets.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.emptyState', {
            defaultMessage: 'No data',
          })}
        </EuiText>
      ) : (
        <div
          style={{
            maxHeight: OVERVIEW_PANEL_CONTENT_HEIGHT,
            overflowY: 'auto',
          }}
        >
          {buckets.map((bucket) => (
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
          ))}
        </div>
      )}
    </EuiPanel>
  );
};

const RegionBreakdown: React.FC<{ buckets: DashboardOverviewResponse['by_region'] }> = ({
  buckets,
}) => {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(...buckets.map((b) => b.report_count), 1);

  const isSecondaryRegion = (region: string) =>
    region === 'global' || region === '<unknown>' || region.toLowerCase().includes('global');

  const primaryBuckets = buckets.filter((b) => !isSecondaryRegion(String(b.region)));
  const secondaryBuckets = buckets.filter((b) => isSecondaryRegion(String(b.region)));

  const affectsYouBadgeCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseWarning,
    color: euiTheme.colors.warningText ?? euiTheme.colors.warning,
  });

  const formatRegionLabel = (region: string) => {
    if (region === 'global' || region.toLowerCase() === 'global') {
      return i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.regionGlobalCrossRegion',
        { defaultMessage: 'Global / cross-region' }
      );
    }
    return region;
  };

  const renderRegionRow = (
    bucket: DashboardOverviewResponse['by_region'][number],
    italic?: boolean
  ) => (
    <div key={String(bucket.region)} css={css({ marginBottom: euiTheme.size.s })}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false} style={{ minWidth: 110, maxWidth: 130 }}>
          <EuiText
            size="s"
            style={italic ? { fontStyle: 'italic' } : undefined}
            color={italic ? 'subdued' : undefined}
          >
            {formatRegionLabel(String(bucket.region))}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiProgress value={bucket.report_count} max={max} size="s" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{bucket.report_count}</strong>
          </EuiText>
        </EuiFlexItem>
        {bucket.affects_you ? (
          <EuiFlexItem grow={false}>
            <EuiBadge css={affectsYouBadgeCss}>
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.affectsYouCountBadge',
                {
                  defaultMessage: 'Affects you: {count}',
                  values: { count: bucket.report_count },
                }
              )}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );

  return (
    <EuiPanel hasBorder paddingSize="m" style={overviewChartPanelStyle}>
      <PanelHeader
        title={i18n.translate('xpack.securitySolution.threatIntelligence.app.regionTitle', {
          defaultMessage: 'Geographic regions',
        })}
      />
      {buckets.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.emptyState', {
            defaultMessage: 'No data',
          })}
        </EuiText>
      ) : (
        <div style={{ maxHeight: OVERVIEW_PANEL_CONTENT_HEIGHT, overflowY: 'auto' }}>
          {primaryBuckets.map((bucket) => renderRegionRow(bucket))}
          {secondaryBuckets.length > 0 ? (
            <>
              <EuiHorizontalRule margin="s" />
              {secondaryBuckets.map((bucket) => renderRegionRow(bucket, true))}
            </>
          ) : null}
        </div>
      )}
    </EuiPanel>
  );
};

const TopTechniques: React.FC<{
  buckets: DashboardOverviewResponse['top_techniques'];
  coverageSummary: DashboardOverviewResponse['coverage_summary'];
}> = ({ buckets, coverageSummary }) => {
  const { euiTheme } = useEuiTheme();
  const max = buckets[0]?.report_count ?? 0;
  const enrichedBuckets = useMemo(
    () =>
      buckets.map((bucket) => ({
        ...bucket,
        metadata: getMitreTechniqueMetadata(bucket.technique_id),
      })),
    [buckets]
  );

  const uncoveredBadgeCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseWarning,
    color: euiTheme.colors.warningText ?? euiTheme.colors.warning,
  });

  const ruleActiveBadgeCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseSuccess,
    color: euiTheme.colors.successText ?? euiTheme.colors.success,
  });

  const coverageDescription =
    buckets.length === 0
      ? undefined
      : i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.techniquesCoverageDescription',
          {
            defaultMessage:
              '{uncovered} uncovered · {enableExisting} with disabled rules to enable · {covered} covered',
            values: {
              uncovered: coverageSummary.uncovered,
              enableExisting: coverageSummary.enable_existing,
              covered: coverageSummary.covered,
            },
          }
        );

  const coverageBadge = (bucket: (typeof enrichedBuckets)[number]) => {
    if (bucket.coverage_recommendation === 'covered') {
      return (
        <EuiBadge css={ruleActiveBadgeCss}>
          {i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.techniqueRuleActiveBadge',
            { defaultMessage: 'Rule active' }
          )}
        </EuiBadge>
      );
    }
    if (bucket.coverage_recommendation === 'enable_existing') {
      return (
        <EuiBadge color="warning">
          {i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.techniqueEnableExistingBadge',
            {
              defaultMessage: 'Enable existing ({count})',
              values: { count: bucket.matching_disabled_rule_count },
            }
          )}
        </EuiBadge>
      );
    }
    return (
      <EuiBadge css={uncoveredBadgeCss}>
        {i18n.translate('xpack.securitySolution.threatIntelligence.app.techniqueUncoveredBadge', {
          defaultMessage: 'Uncovered',
        })}
      </EuiBadge>
    );
  };

  return (
    <EuiPanel hasBorder paddingSize="m" style={overviewChartPanelStyle}>
      <PanelHeader
        title={i18n.translate('xpack.securitySolution.threatIntelligence.app.techniquesTitle', {
          defaultMessage: 'Top ATT&CK techniques',
        })}
        description={
          coverageDescription ??
          i18n.translate('xpack.securitySolution.threatIntelligence.app.techniquesDescription', {
            defaultMessage: 'Most frequent techniques extracted from reports',
          })
        }
      />
      {buckets.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.emptyState', {
            defaultMessage: 'No data',
          })}
        </EuiText>
      ) : (
        <div style={{ maxHeight: OVERVIEW_PANEL_CONTENT_HEIGHT, overflowY: 'auto' }}>
          {enrichedBuckets.map((bucket, index) => (
            <div key={bucket.technique_id}>
              {index > 0 ? <EuiHorizontalRule margin="s" /> : null}
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiToolTip content={bucket.metadata.name}>
                    <EuiText size="s">
                      {bucket.technique_id}
                      {' · '}
                      {bucket.metadata.name}
                    </EuiText>
                  </EuiToolTip>
                  <div css={css({ maxWidth: 120, marginTop: 4 })}>
                    <EuiProgress
                      value={bucket.report_count}
                      max={max || 1}
                      size="s"
                      color="primary"
                    />
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>{bucket.report_count}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      bucket.coverage_recommendation === 'enable_existing' &&
                      bucket.matching_disabled_rule_ids?.length
                        ? i18n.translate(
                            'xpack.securitySolution.threatIntelligence.app.techniqueEnableExistingTooltip',
                            {
                              defaultMessage:
                                'Enable existing rule(s): {ruleIds}. Do not create a duplicate.',
                              values: {
                                ruleIds: bucket.matching_disabled_rule_ids.join(', '),
                              },
                            }
                          )
                        : bucket.coverage_recommendation === 'covered'
                        ? i18n.translate(
                            'xpack.securitySolution.threatIntelligence.app.techniqueCoveredTooltip',
                            {
                              defaultMessage:
                                'Covered by {count, plural, one {# enabled rule} other {# enabled rules}}',
                              values: { count: bucket.matching_rule_count },
                            }
                          )
                        : i18n.translate(
                            'xpack.securitySolution.threatIntelligence.app.techniqueUncoveredTooltip',
                            {
                              defaultMessage:
                                'No matching Detection Engine rule — consider creating coverage',
                            }
                          )
                    }
                  >
                    <span>{coverageBadge(bucket)}</span>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          ))}
        </div>
      )}
    </EuiPanel>
  );
};

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
  const size = OVERVIEW_PANEL_CONTENT_HEIGHT;
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
    <EuiPanel hasBorder paddingSize="m" style={overviewChartPanelStyle}>
      <PanelHeader
        title={i18n.translate('xpack.securitySolution.threatIntelligence.app.threatRadarTitle', {
          defaultMessage: 'Threat radar',
        })}
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
 * Scatter-style activity timeline. Events are absolutely positioned by
 * bucket timestamp so marker size stays readable when the panel is narrow
 * (equal-width flex columns used to shrink dots to 1px with many daily buckets).
 */
const TIMELINE_DOT_MIN_PX = 6;
const TIMELINE_DOT_MAX_PX = 14;

const formatTimelineAxisLabel = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const parseTimeRangeLabel = (timeRangeLabel: string): { start?: string; end?: string } => {
  const [start, end] = timeRangeLabel.split(/\s*→\s*/);
  return {
    ...(start ? { start: start.trim() } : {}),
    ...(end ? { end: end.trim() } : {}),
  };
};

const ActivityTimeline: React.FC<{
  buckets: DashboardOverviewResponse['severity_timeline'];
  timeRangeLabel: string;
}> = ({ buckets, timeRangeLabel }) => {
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

  const {
    start: rangeStart,
    end: rangeEnd,
    startMs,
    rangeMs,
  } = useMemo(() => {
    const parsed = parseTimeRangeLabel(timeRangeLabel);
    const start = parsed.start ?? buckets[0]?.bucket;
    const end = parsed.end ?? buckets[buckets.length - 1]?.bucket;
    const parsedStartMs = start ? new Date(start).getTime() : Number.NaN;
    const parsedEndMs = end ? new Date(end).getTime() : Number.NaN;
    const safeStartMs = Number.isFinite(parsedStartMs) ? parsedStartMs : 0;
    const safeEndMs = Number.isFinite(parsedEndMs) ? parsedEndMs : safeStartMs;
    return {
      start,
      end,
      startMs: safeStartMs,
      rangeMs: Math.max(safeEndMs - safeStartMs, 1),
    };
  }, [buckets, timeRangeLabel]);

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      style={{ ...overviewChartPanelStyle, overflow: 'hidden' }}
      data-test-subj="threatIntelActivityTimeline"
    >
      <PanelHeader
        title={i18n.translate('xpack.securitySolution.threatIntelligence.app.timelineTitle', {
          defaultMessage: 'Activity timeline',
        })}
      />
      {buckets.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.emptyState', {
            defaultMessage: 'No data',
          })}
        </EuiText>
      ) : (
        <div
          css={css({
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr)',
            gridTemplateRows: 'minmax(0, 1fr) auto',
            columnGap: euiTheme.size.m,
            rowGap: euiTheme.size.xs,
            flex: 1,
            minHeight: 0,
            height: OVERVIEW_PANEL_CONTENT_HEIGHT,
            overflow: 'hidden',
          })}
        >
          <div
            css={css({
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: 10,
              color: euiTheme.colors.darkShade,
              paddingTop: euiTheme.size.xs,
              paddingBottom: euiTheme.size.xs,
              minHeight: 0,
            })}
          >
            {rowOrder.map((severity) => (
              <span key={`label-${severity}`}>{severity.toUpperCase()}</span>
            ))}
          </div>
          <div
            css={css({
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
              position: 'relative',
            })}
            data-test-subj="threatIntelActivityTimelinePlot"
          >
            {buckets.flatMap((bucket) => {
              const bucketMs = new Date(bucket.bucket).getTime();
              if (!Number.isFinite(bucketMs)) {
                return [];
              }
              const leftPct = Math.min(100, Math.max(0, ((bucketMs - startMs) / rangeMs) * 100));
              return rowOrder.flatMap((severity, rowIndex) => {
                const count = bucket[severity];
                if (count === 0) {
                  return [];
                }
                const ratio = maxCount === 0 ? 0 : count / maxCount;
                const diameter = Math.max(
                  TIMELINE_DOT_MIN_PX,
                  Math.min(TIMELINE_DOT_MIN_PX + Math.round(ratio * 8), TIMELINE_DOT_MAX_PX)
                );
                const topPct = ((rowIndex + 0.5) / rowOrder.length) * 100;
                return [
                  <span
                    key={`${bucket.bucket}-${severity}`}
                    title={`${bucket.bucket}\n${severity}: ${count}`}
                    css={css({
                      position: 'absolute',
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: diameter,
                      height: diameter,
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: SEVERITY_HEX[severity],
                      boxShadow: `0 0 0 1px ${euiTheme.colors.emptyShade}`,
                      pointerEvents: 'auto',
                    })}
                  />,
                ];
              });
            })}
          </div>
          <div />
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="none"
            responsive={false}
            css={css({
              minWidth: 0,
              fontSize: 10,
              color: euiTheme.colors.darkShade,
              gap: euiTheme.size.s,
            })}
            data-test-subj="threatIntelActivityTimelineAxis"
          >
            <EuiFlexItem grow={false} css={css({ minWidth: 0 })}>
              <span css={css({ whiteSpace: 'nowrap' })}>
                {rangeStart
                  ? formatTimelineAxisLabel(rangeStart)
                  : i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.timelineFirstBucket',
                      { defaultMessage: 'Oldest' }
                    )}
              </span>
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={css({ minWidth: 0 })}>
              <span css={css({ whiteSpace: 'nowrap' })}>
                {rangeEnd
                  ? formatTimelineAxisLabel(rangeEnd)
                  : i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.timelineLastBucket',
                      { defaultMessage: 'Now' }
                    )}
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      )}
    </EuiPanel>
  );
};

const EnvironmentImpact: React.FC<{
  impact: DashboardOverviewResponse['environment_impact'];
  totalReports: number;
  onHighlightReport: (reportId: string) => void;
}> = ({ impact, onHighlightReport }) => {
  const { euiTheme } = useEuiTheme();
  const { total_hits, layer_1_hits, layer_2_hits, top_reports } = impact;
  const layer1Share = total_hits > 0 ? layer_1_hits / total_hits : 0;
  const layer2Share = total_hits > 0 ? layer_2_hits / total_hits : 0;
  const maxReportHits = Math.max(...top_reports.map((r) => r.environment_hits_total), 1);

  // Prototype: Layer 1 = pink/magenta, Layer 2 = blue
  const layer1Color = euiTheme.colors.accent;
  const layer2Color = euiTheme.colors.primary;

  const hitCountBadgeCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseDanger,
    color: euiTheme.colors.danger,
    minWidth: 28,
    justifyContent: 'center',
  });

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      style={overviewChartPanelStyle}
      data-test-subj="threatIntelDetectionEngineAttributions"
    >
      <PanelHeader
        title={i18n.translate('xpack.securitySolution.threatIntelligence.app.envImpactTitle', {
          defaultMessage: 'Detection Engine attributions',
        })}
        description={i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.envImpactDescription',
          {
            defaultMessage: 'Detection Engine alerts attributed to ingested reports',
          }
        )}
      />
      {total_hits === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.securitySolution.threatIntelligence.app.envImpactEmpty', {
            defaultMessage:
              'No correlated alerts in the selected time range. Reports need extracted IOCs or behaviors before the hourly attribution backfill can attribute hits.',
          })}
        </EuiText>
      ) : (
        <>
          <EuiText>
            <h2 style={{ margin: 0, fontSize: euiTheme.size.xl, lineHeight: 1.2 }}>
              {total_hits.toLocaleString()}
            </h2>
          </EuiText>
          <EuiSpacer size="s" />
          <div
            aria-hidden
            style={{
              display: 'flex',
              height: 10,
              borderRadius: euiTheme.size.xs,
              overflow: 'hidden',
              background: euiTheme.colors.lightestShade,
            }}
          >
            {layer_1_hits > 0 ? (
              <div style={{ width: `${layer1Share * 100}%`, background: layer1Color }} />
            ) : null}
            {layer_2_hits > 0 ? (
              <div style={{ width: `${layer2Share * 100}%`, background: layer2Color }} />
            ) : null}
          </div>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: layer1Color,
                      display: 'inline-block',
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.securitySolution.threatIntelligence.app.envL1Legend', {
                      defaultMessage: 'Layer 1 — IOC match',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: layer2Color,
                      display: 'inline-block',
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.securitySolution.threatIntelligence.app.envL2Legend', {
                      defaultMessage: 'Layer 2 — ATT&CK overlap',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          {top_reports.length > 0 ? (
            <>
              <EuiSpacer size="m" />
              <EuiTitle size="xxs">
                <h4>
                  {i18n.translate('xpack.securitySolution.threatIntelligence.app.envTopReports', {
                    defaultMessage: 'Top reports by environment hits',
                  })}
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <div style={{ maxHeight: OVERVIEW_PANEL_CONTENT_HEIGHT - 140, overflowY: 'auto' }}>
                {top_reports.map((report, index) => (
                  <div key={report.report_id}>
                    {index > 0 ? <EuiHorizontalRule margin="s" /> : null}
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem>
                        <EuiLink
                          color="text"
                          onClick={() => onHighlightReport(report.report_id)}
                          data-test-subj={`threatIntelEnvImpactReport-${report.report_id}`}
                        >
                          <EuiText size="s">
                            <span
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {report.title}
                            </span>
                          </EuiText>
                        </EuiLink>
                        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
                          {report.layer_1_hits > 0 ? (
                            <EuiFlexItem grow={false}>
                              <EuiBadge color="hollow">
                                {i18n.translate(
                                  'xpack.securitySolution.threatIntelligence.app.envLayer1ShortBadge',
                                  { defaultMessage: 'L1' }
                                )}
                              </EuiBadge>
                            </EuiFlexItem>
                          ) : null}
                          {report.layer_2_hits > 0 ? (
                            <EuiFlexItem grow={false}>
                              <EuiBadge color="hollow">
                                {i18n.translate(
                                  'xpack.securitySolution.threatIntelligence.app.envLayer2ShortBadge',
                                  { defaultMessage: 'L2' }
                                )}
                              </EuiBadge>
                            </EuiFlexItem>
                          ) : null}
                        </EuiFlexGroup>
                        <div css={css({ marginTop: 4 })}>
                          <EuiProgress
                            value={report.environment_hits_total}
                            max={maxReportHits}
                            size="xs"
                            color="accent"
                          />
                        </div>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge css={hitCountBadgeCss}>
                          {report.environment_hits_total.toLocaleString()}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </EuiPanel>
  );
};
