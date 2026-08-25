/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Summary charts for facelift: Entities-by pie panel (and Sources in the
 * full SummaryCharts export). Counts match the filtered Entities table.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { Datum, Key, PartialTheme } from '@elastic/charts';
import { Chart, Partition, PartitionLayout, Settings } from '@elastic/charts';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiPanel,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';

import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { RiskSeverity } from '../../../../../../common/search_strategy';
import { HeaderSection } from '../../../../../common/components/header_section';
import { useThemes } from '../../../../../common/components/charts/common';
import { ChartLabel } from '../../../../../overview/components/detection_response/alerts_by_status/chart_label';
import { DonutChart } from '../../../../../common/components/charts/donutchart';
import type { FillColor } from '../../../../../common/components/charts/donutchart';
import { StackByComboBox } from '../../../../../detections/components/alerts_kpis/common/components';
import { useRiskScoreFillColor } from '../../../risk_score_donut_chart/use_risk_score_fill_color';
import { RiskLevelBreakdownTable } from '../../risk_level_breakdown_table';
import {
  AssetCriticalityBadge,
  getCriticalityLevelColor,
} from '../../../asset_criticality/asset_criticality_badge';
import { CRITICALITY_LEVEL_TITLE } from '../../../asset_criticality/translations';
import { EntityIconByType } from '../../../entity_store/entity_icon_by_type';
import type { PageFilters, TableView } from './data';
import {
  getSummaryCriticalityCounts,
  getSummaryEntityTypeCounts,
  getSummaryRiskLevelCounts,
  getSummarySourceCounts,
  SUMMARY_ENTITY_TYPES,
  type SummaryCriticalityCount,
  type SummaryEntityTypeCount,
  type SummarySourceCount,
} from './summary_data';
import { METRIC_CHARTS_BODY_HEIGHT, SUMMARY_CONTENT_HEIGHT } from './metric_charts_layout';

/** Fixed pie size so risk / criticality / entity-type donuts share the same slot. */
const DONUT_SIZE = 175;
const TREEMAP_FONT_SIZE = 14;
const ENTITIES_BY_COMBOBOX_WIDTH = 160;
const LEGEND_ROW_MIN_HEIGHT = 32;

const FILTER_FOR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.summary.filterFor',
  { defaultMessage: 'Filter for' }
);
const FILTER_OUT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.summary.filterOut',
  { defaultMessage: 'Filter out' }
);
const ADD_TO_TIMELINE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.summary.addToTimeline',
  { defaultMessage: 'Add to Timeline' }
);
const OPEN_ACTIONS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.summary.openActions',
  { defaultMessage: 'Open actions' }
);

/** Same equal-width wrap behavior as Alerts Summary (`AlertsSummaryChartsPanel`). */
const StyledFlexItem = styled(EuiFlexItem)`
  min-width: 355px;
  flex: 1 1 0;
  block-size: 100%;
`;

const legendTableCss = css`
  /* Match row height across Entities-by and Sources legend tables. */
  .euiTableRowCell {
    vertical-align: middle;
  }
  .euiTableRowCell > .euiTableCellContent {
    min-block-size: ${LEGEND_ROW_MIN_HEIGHT}px;
    align-items: center;
  }
`;

/**
 * Equal columns with a 16px gutter (`gutterSize="m"`): flex shares remaining
 * space after the gutter (not a hard % that would overflow the gap).
 */

/** Entities-by legend — 60% of the panel (after the 16px gutter). */
const entitiesByLegendItemCss = css`
  flex: 60 1 0%;
  min-inline-size: 0;
`;

/** Entities-by donut — remainder beside the 60% legend. */
const entitiesByChartItemCss = css`
  flex: 40 1 0%;
  min-inline-size: 0;
`;

/** Sources legend column — remainder beside the 66% treemap. */
const sourcesLegendItemCss = css`
  flex: 34 1 0%;
  min-inline-size: 0;
`;

/** Sources treemap column — ~66% of the panel (after the 16px gutter). */
const sourcesTreemapItemCss = css`
  flex: 66 1 0%;
  min-inline-size: 0;
`;

const chartSlotCss = css`
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: 100%;
  block-size: 100%;
`;

const donutFrameCss = css`
  inline-size: ${DONUT_SIZE}px;
  block-size: ${DONUT_SIZE}px;

  /* Vertically center the donut label stack; count (first flex item) at 20px. */
  [data-test-subj='donut-chart'] > .euiFlexItem > .euiFlexGroup {
    top: 50% !important;
    transform: translateY(-50%);
  }

  [data-test-subj='donut-chart'] > .euiFlexItem > .euiFlexGroup > .euiFlexItem:first-of-type {
    font-size: 32px;
  }
`;

/** Treemap fills its column; height must be px so Chart can paint. */
const treemapFrameCss = css`
  inline-size: 100%;
  block-size: ${SUMMARY_CONTENT_HEIGHT}px;
`;

/**
 * HeaderSection defaults to 24px (`size.l`) under the title via `.toggle-expand`.
 * Force 16px below the Entities-by title.
 */
const SummaryPanelHeader: React.FC<{
  title: string;
  children?: React.ReactNode;
}> = ({ title, children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        & > [data-test-subj='header-section'],
        & > [data-test-subj='header-section'].toggle-expand,
        & > .siemHeaderSection {
          margin-bottom: ${euiTheme.size.m} !important; /* 16px */
        }
      `}
    >
      <HeaderSection
        outerDirection="row"
        title={title}
        titleSize="xs"
        hideSubtitle
        showInspectButton={false}
      >
        {children}
      </HeaderSection>
    </div>
  );
};

/**
 * Always-visible Alerts-style ⋮ menu for legend rows (prototype — does not
 * depend on data-view field resolution).
 */
const LegendRowActions: React.FC<{ label: string }> = ({ label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((open) => !open), []);

  const items = useMemo(
    () => [
      <EuiContextMenuItem key="filterFor" icon="plusCircle" onClick={close}>
        {FILTER_FOR}
      </EuiContextMenuItem>,
      <EuiContextMenuItem key="filterOut" icon="minusCircle" onClick={close}>
        {FILTER_OUT}
      </EuiContextMenuItem>,
      <EuiContextMenuItem key="addToTimeline" icon="timeline" onClick={close}>
        {ADD_TO_TIMELINE}
      </EuiContextMenuItem>,
    ],
    [close]
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={close}
      panelPaddingSize="none"
      anchorPosition="leftCenter"
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          color="text"
          display="empty"
          size="xs"
          aria-label={`${OPEN_ACTIONS}: ${label}`}
          onClick={toggle}
        />
      }
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};

export type EntitiesBySelection = 'risk level' | 'asset criticality' | 'entity type';

const ENTITIES_BY_OPTIONS: Array<{ value: EntitiesBySelection; label: string }> = [
  {
    value: 'risk level',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.facelift.summary.entitiesBy.riskLevel',
      { defaultMessage: 'risk level' }
    ),
  },
  {
    value: 'asset criticality',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.facelift.summary.entitiesBy.assetCriticality',
      { defaultMessage: 'asset criticality' }
    ),
  },
  {
    value: 'entity type',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.facelift.summary.entitiesBy.entityType',
      { defaultMessage: 'entity type' }
    ),
  },
];

const CRITICALITY_ORDER: CriticalityLevelWithUnassigned[] = [
  'extreme_impact',
  'high_impact',
  'medium_impact',
  'low_impact',
  'unassigned',
];

/** Risk pie: Critical → High → Moderate → Low → Unknown, clockwise from north. */
const RISK_PIE_ORDER: RiskSeverity[] = [
  RiskSeverity.Critical,
  RiskSeverity.High,
  RiskSeverity.Moderate,
  RiskSeverity.Low,
  RiskSeverity.Unknown,
];

const COUNT_COLUMN = (
  <FormattedMessage
    id="xpack.securitySolution.entityAnalytics.facelift.summary.count"
    defaultMessage="Count"
  />
);

const TITLES = {
  entitiesBy: i18n.translate(
    'xpack.securitySolution.entityAnalytics.facelift.summary.entitiesBy',
    { defaultMessage: 'Entities by' }
  ),
  sources: i18n.translate('xpack.securitySolution.entityAnalytics.facelift.summary.sources', {
    defaultMessage: 'Sources',
  }),
  entities: i18n.translate('xpack.securitySolution.entityAnalytics.facelift.summary.entities', {
    defaultMessage: 'entities',
  }),
};

interface CriticalityBreakdownItem {
  level: CriticalityLevelWithUnassigned;
  count: number;
}

interface EntityTypeBreakdownItem {
  entityType: EntityType.user | EntityType.host | EntityType.service;
  count: number;
}

const CriticalityBreakdownTable: React.FC<{ counts: SummaryCriticalityCount }> = ({ counts }) => {
  const { euiTheme } = useEuiTheme();

  const items: CriticalityBreakdownItem[] = useMemo(
    () => CRITICALITY_ORDER.map((level) => ({ level, count: counts[level] ?? 0 })),
    [counts]
  );

  const columns: Array<EuiBasicTableColumn<CriticalityBreakdownItem>> = useMemo(
    () => [
      {
        field: 'level',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.facelift.summary.criticalityLevel"
            defaultMessage="Asset criticality"
          />
        ),
        render: (level: CriticalityLevelWithUnassigned) => (
          <AssetCriticalityBadge criticalityLevel={level} style={{ lineHeight: 'inherit' }} />
        ),
      },
      {
        field: 'count',
        name: COUNT_COLUMN,
        align: 'right',
        render: (count: number) => (
          <EuiText size="s" style={{ fontWeight: euiTheme.font.weight.semiBold }}>
            {getAbbreviatedNumber(count)}
          </EuiText>
        ),
      },
      {
        field: 'level',
        name: '',
        width: '40px',
        render: (level: CriticalityLevelWithUnassigned) => (
          <LegendRowActions label={CRITICALITY_LEVEL_TITLE[level]} />
        ),
      },
    ],
    [euiTheme.font.weight.semiBold]
  );

  return (
    <div css={legendTableCss}>
      <EuiInMemoryTable
        items={items}
        compressed
        columns={columns}
        tableCaption="Asset criticality breakdown by entity count"
        data-test-subj="eaFaceliftSummaryCriticalityTable"
      />
    </div>
  );
};

/** Same slot + DonutChart path as the other two pies (no RiskScoreDonutChart padding). */
const SummaryRiskDonut: React.FC<{ severityCount: ReturnType<typeof getSummaryRiskLevelCounts> }> = ({
  severityCount,
}) => {
  const fillColor = useRiskScoreFillColor();
  const donutChartData = useMemo(
    () =>
      RISK_PIE_ORDER.map((status) => ({
        key: status,
        value: severityCount[status],
      })),
    [severityCount]
  );
  const total = useMemo(
    () => donutChartData.reduce((sum, entry) => sum + entry.value, 0),
    [donutChartData]
  );

  return (
    <div css={chartSlotCss} data-test-subj="eaFaceliftSummaryRiskDonut">
      <div css={donutFrameCss} className="eui-textCenter">
        <DonutChart
          data={donutChartData}
          fillColor={fillColor}
          height={DONUT_SIZE}
          label={TITLES.entities}
          title={<ChartLabel count={total} />}
          totalCount={total}
          preserveDataOrder
        />
      </div>
    </div>
  );
};

const CriticalityDonutChart: React.FC<{ counts: SummaryCriticalityCount }> = ({ counts }) => {
  const { euiTheme } = useEuiTheme();

  const data = useMemo(
    () =>
      CRITICALITY_ORDER.map((level) => ({
        key: CRITICALITY_LEVEL_TITLE[level],
        value: counts[level] ?? 0,
      })),
    [counts]
  );

  const total = useMemo(() => data.reduce((sum, entry) => sum + entry.value, 0), [data]);

  const fillColor: FillColor = useCallback(
    (dataName: string) => {
      const level = CRITICALITY_ORDER.find((entry) => CRITICALITY_LEVEL_TITLE[entry] === dataName);
      return getCriticalityLevelColor(euiTheme, level ?? 'unassigned');
    },
    [euiTheme]
  );

  return (
    <div css={chartSlotCss} data-test-subj="eaFaceliftSummaryCriticalityDonut">
      <div css={donutFrameCss} className="eui-textCenter">
        <DonutChart
          data={data}
          fillColor={fillColor}
          height={DONUT_SIZE}
          label={TITLES.entities}
          title={<ChartLabel count={total} />}
          totalCount={total}
          preserveDataOrder
        />
      </div>
    </div>
  );
};

const EntityTypeCell: React.FC<{ entityType: EntityType }> = ({ entityType }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={EntityIconByType[entityType]} size="s" color="subdued" aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">{capitalize(entityType)}</EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const EntityTypeBreakdownTable: React.FC<{ counts: SummaryEntityTypeCount }> = ({ counts }) => {
  const { euiTheme } = useEuiTheme();

  const items: EntityTypeBreakdownItem[] = useMemo(
    () =>
      SUMMARY_ENTITY_TYPES.map((entityType) => ({
        entityType,
        count: counts[entityType] ?? 0,
      })),
    [counts]
  );

  const columns: Array<EuiBasicTableColumn<EntityTypeBreakdownItem>> = useMemo(
    () => [
      {
        field: 'entityType',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.facelift.summary.entityType"
            defaultMessage="Entity type"
          />
        ),
        render: (entityType: EntityType.user | EntityType.host | EntityType.service) => (
          <EntityTypeCell entityType={entityType} />
        ),
      },
      {
        field: 'count',
        name: COUNT_COLUMN,
        align: 'right',
        render: (count: number) => (
          <EuiText size="s" style={{ fontWeight: euiTheme.font.weight.semiBold }}>
            {getAbbreviatedNumber(count)}
          </EuiText>
        ),
      },
      {
        field: 'entityType',
        name: '',
        width: '40px',
        render: (entityType: EntityType.user | EntityType.host | EntityType.service) => (
          <LegendRowActions label={capitalize(entityType)} />
        ),
      },
    ],
    [euiTheme.font.weight.semiBold]
  );

  return (
    <div css={legendTableCss}>
      <EuiInMemoryTable
        items={items}
        compressed
        columns={columns}
        tableCaption="Entity type breakdown by entity count"
        data-test-subj="eaFaceliftSummaryEntityTypeTable"
      />
    </div>
  );
};

const EntityTypeDonutChart: React.FC<{ counts: SummaryEntityTypeCount }> = ({ counts }) => {
  const { euiTheme } = useEuiTheme();

  const palette = useMemo(
    () => [
      euiTheme.colors.vis.euiColorVis0,
      euiTheme.colors.vis.euiColorVis1,
      euiTheme.colors.vis.euiColorVis2,
    ],
    [euiTheme.colors.vis]
  );

  const data = useMemo(
    () =>
      SUMMARY_ENTITY_TYPES.map((entityType) => ({
        key: capitalize(entityType),
        value: counts[entityType] ?? 0,
      })),
    [counts]
  );

  const total = useMemo(() => data.reduce((sum, entry) => sum + entry.value, 0), [data]);

  const colorByLabel = useMemo(() => {
    const map = new Map<string, string>();
    SUMMARY_ENTITY_TYPES.forEach((entityType, index) => {
      map.set(capitalize(entityType), palette[index % palette.length]);
    });
    return map;
  }, [palette]);

  const fillColor: FillColor = useCallback(
    (dataName: string) => colorByLabel.get(dataName) ?? palette[0],
    [colorByLabel, palette]
  );

  return (
    <div css={chartSlotCss} data-test-subj="eaFaceliftSummaryEntityTypeDonut">
      <div css={donutFrameCss} className="eui-textCenter">
        <DonutChart
          data={data}
          fillColor={fillColor}
          height={DONUT_SIZE}
          label={TITLES.entities}
          title={<ChartLabel count={total} />}
          totalCount={total}
          preserveDataOrder
        />
      </div>
    </div>
  );
};

const SourcesBreakdownTable: React.FC<{ data: SummarySourceCount[] }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();

  const columns: Array<EuiBasicTableColumn<SummarySourceCount>> = useMemo(
    () => [
      {
        field: 'key',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.facelift.summary.source"
            defaultMessage="Sources"
          />
        ),
        render: (source: string) => <EuiText size="s">{source}</EuiText>,
      },
      {
        field: 'value',
        name: COUNT_COLUMN,
        align: 'right',
        render: (count: number) => (
          <EuiText size="s" style={{ fontWeight: euiTheme.font.weight.semiBold }}>
            {getAbbreviatedNumber(count)}
          </EuiText>
        ),
      },
      {
        field: 'key',
        name: '',
        width: '40px',
        render: (source: string) => <LegendRowActions label={source} />,
      },
    ],
    [euiTheme.font.weight.semiBold]
  );

  return (
    <div css={legendTableCss}>
      <EuiInMemoryTable
        items={data}
        compressed
        columns={columns}
        tableCaption="Sources breakdown by entity count"
        data-test-subj="eaFaceliftSummarySourcesTable"
      />
    </div>
  );
};

const SourcesTreemap: React.FC<{ data: SummarySourceCount[] }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const { theme, baseTheme } = useThemes();

  const treemapTheme: PartialTheme = useMemo(
    () => ({
      partition: {
        fillLabel: {
          fontSize: TREEMAP_FONT_SIZE,
          valueFont: { fontWeight: 700, fontSize: TREEMAP_FONT_SIZE },
        },
        idealFontSizeJump: 1.01,
        maxFontSize: TREEMAP_FONT_SIZE,
        minFontSize: TREEMAP_FONT_SIZE,
        sectorLineStroke: euiTheme.colors.emptyShade,
        sectorLineWidth: 1.5,
      },
    }),
    [euiTheme.colors.emptyShade]
  );

  const palette = useMemo(
    () => [
      euiTheme.colors.vis.euiColorVis0,
      euiTheme.colors.vis.euiColorVis1,
      euiTheme.colors.vis.euiColorVis2,
      euiTheme.colors.vis.euiColorVis3,
      euiTheme.colors.vis.euiColorVis4,
      euiTheme.colors.vis.euiColorVis5,
      euiTheme.colors.vis.euiColorVis6,
      euiTheme.colors.vis.euiColorVis7,
    ],
    [euiTheme.colors.vis]
  );

  const colorBySource = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((entry, index) => {
      map.set(entry.key, palette[index % palette.length]);
    });
    return map;
  }, [data, palette]);

  if (!data.length) {
    return (
      <EuiText size="s" color="subdued" textAlign="center">
        {i18n.translate('xpack.securitySolution.entityAnalytics.facelift.summary.sourcesEmpty', {
          defaultMessage: 'No sources for the current filters',
        })}
      </EuiText>
    );
  }

  return (
    <div css={chartSlotCss} data-test-subj="eaFaceliftSummarySourcesTreemap">
      <div css={treemapFrameCss}>
        {/* Width % needs a sized parent; height must be px — % collapses in flex. */}
        <Chart size={['100%', SUMMARY_CONTENT_HEIGHT]}>
          <Settings
            baseTheme={baseTheme}
            theme={[treemapTheme, theme]}
            showLegend={false}
            locale={i18n.getLocale()}
          />
          <Partition
            id="ea-facelift-sources-treemap"
            data={data}
            valueAccessor={(d: Datum) => (d as SummarySourceCount).value}
            layers={[
              {
                fillLabel: {
                  valueFormatter: (value: number) => `${value}`,
                },
                groupByRollup: (d: Datum) => (d as SummarySourceCount).key,
                nodeLabel: (key: Datum) => String(key ?? ''),
                shape: {
                  fillColor: (dataName: Key) =>
                    colorBySource.get(String(dataName)) ?? palette[0],
                },
              },
            ]}
            layout={PartitionLayout.treemap}
          />
        </Chart>
      </div>
    </div>
  );
};

const chartTableBodyCss = css`
  min-block-size: ${SUMMARY_CONTENT_HEIGHT}px;
  block-size: ${SUMMARY_CONTENT_HEIGHT}px;
  align-items: center;
`;

/**
 * Entities-by pie panel (risk / criticality / entity type) used as the left
 * overview half in v.5.
 */
export const EntitiesByPanel: React.FC<{
  pageFilters: PageFilters;
  tableView: TableView;
}> = ({ pageFilters, tableView }) => {
  const { euiTheme } = useEuiTheme();
  const [selection, setSelection] = useState<EntitiesBySelection>('risk level');

  const severityCount = useMemo(
    () => getSummaryRiskLevelCounts(pageFilters, tableView),
    [pageFilters, tableView]
  );
  const criticalityCounts = useMemo(
    () => getSummaryCriticalityCounts(pageFilters, tableView),
    [pageFilters, tableView]
  );
  const entityTypeCounts = useMemo(
    () => getSummaryEntityTypeCounts(pageFilters, tableView),
    [pageFilters, tableView]
  );

  const onSelect = useCallback((field: string) => {
    if (field === 'risk level' || field === 'asset criticality' || field === 'entity type') {
      setSelection(field);
    }
  }, []);

  const renderRiskActions = useCallback(
    (level: RiskSeverity) => <LegendRowActions label={level} />,
    []
  );

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="m"
      data-test-subj="eaFaceliftSummaryEntitiesBy"
      css={css`
        block-size: ${METRIC_CHARTS_BODY_HEIGHT}px;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
      `}
    >
      <SummaryPanelHeader title={TITLES.entitiesBy}>
        <StackByComboBox
          data-test-subj="eaFaceliftSummaryEntitiesBySelector"
          selected={selection}
          onSelect={onSelect}
          prepend=""
          width={ENTITIES_BY_COMBOBOX_WIDTH}
          dropDownoptions={ENTITIES_BY_OPTIONS}
        />
      </SummaryPanelHeader>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={chartTableBodyCss}
      >
        <EuiFlexItem css={entitiesByLegendItemCss}>
          {selection === 'risk level' ? (
            <div css={legendTableCss}>
              <RiskLevelBreakdownTable
                severityCount={severityCount}
                loading={false}
                countColumnName={COUNT_COLUMN}
                renderCellActions={renderRiskActions}
              />
            </div>
          ) : null}
          {selection === 'asset criticality' ? (
            <div css={legendTableCss}>
              <CriticalityBreakdownTable counts={criticalityCounts} />
            </div>
          ) : null}
          {selection === 'entity type' ? (
            <div css={legendTableCss}>
              <EntityTypeBreakdownTable counts={entityTypeCounts} />
            </div>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem css={entitiesByChartItemCss}>
          {selection === 'risk level' ? <SummaryRiskDonut severityCount={severityCount} /> : null}
          {selection === 'asset criticality' ? (
            <CriticalityDonutChart counts={criticalityCounts} />
          ) : null}
          {selection === 'entity type' ? (
            <EntityTypeDonutChart counts={entityTypeCounts} />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const SourcesPanel: React.FC<{
  pageFilters: PageFilters;
  tableView: TableView;
}> = ({ pageFilters, tableView }) => {
  const sourceCounts = useMemo(
    () => getSummarySourceCounts(pageFilters, tableView),
    [pageFilters, tableView]
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="eaFaceliftSummarySources"
      css={css`
        block-size: ${METRIC_CHARTS_BODY_HEIGHT}px;
      `}
    >
      <SummaryPanelHeader title={TITLES.sources} />
      <EuiFlexGroup
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={chartTableBodyCss}
      >
        <EuiFlexItem css={sourcesLegendItemCss}>
          <SourcesBreakdownTable data={sourceCounts} />
        </EuiFlexItem>
        <EuiFlexItem css={sourcesTreemapItemCss}>
          <SourcesTreemap data={sourceCounts} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export interface SummaryChartsProps {
  pageFilters: PageFilters;
  tableView: TableView;
}

/**
 * Two equal-width Summary panels. Counts always match the filtered Entities table.
 */
export const SummaryCharts: React.FC<SummaryChartsProps> = ({ pageFilters, tableView }) => (
  <EuiFlexGroup
    gutterSize="m"
    wrap
    alignItems="stretch"
    data-test-subj="eaFaceliftMetricChartsSummary"
    css={css`
      block-size: ${METRIC_CHARTS_BODY_HEIGHT}px;
    `}
  >
    <StyledFlexItem>
      <EntitiesByPanel pageFilters={pageFilters} tableView={tableView} />
    </StyledFlexItem>
    <StyledFlexItem>
      <SourcesPanel pageFilters={pageFilters} tableView={tableView} />
    </StyledFlexItem>
  </EuiFlexGroup>
);
