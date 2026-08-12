/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, ReactNode } from 'react';
import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { capitalize, noop } from 'lodash';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  useEuiTheme,
  type EuiDataGridCellValueElementProps,
  type EuiDataGridColumn,
  type EuiDataGridColumnSortingConfig,
  type EuiDataGridControlColumn,
  type EuiDataGridCustomBodyProps,
  type EuiDataGridRowHeightsOptions,
  type EuiDataGridStyle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useGrouping, type GroupOption } from '@kbn/grouping';

import type { EntityType } from '../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import { createDataProviders } from '../../../../app/actions/add_to_timeline/data_provider';
import { useInvestigateInTimeline } from '../../../../common/hooks/timeline/use_investigate_in_timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { InspectButton } from '../../../../common/components/inspect';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../flyout/entity_details/shared/constants';
import { getSeverityColor } from '../../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import { AssetCriticalityBadge } from '../../asset_criticality';
import { EntityIconByType } from '../../entity_store/entity_icon_by_type';
import { ENTITY_ANALYTICS_TABLE_ID } from '../constants';
import { LastUpdated } from '../last_updated';
import { DataViewContext } from '../entities_table';
import { AdditionalControls } from '../entities_table/additional_controls';
import { ENTITY_GROUPING_OPTIONS } from '../entities_table/constants';
import { RiskScoreCell } from '../entities_table/risk_score_cell';
import type { TableView } from './data';
import type {
  AlertSeverityCounts,
  EntityRow,
  RawRecordRow,
  ResolvedEntityRow,
  ResolvedToTarget,
} from './resolved_entities_data';
import {
  ALERT_SEVERITIES,
  CRITICALITY_RANK,
  getRawRecords,
  getResolvedEntities,
} from './resolved_entities_data';

/** Always show "3 hours ago" rather than switching to an absolute date. */
const ALWAYS_RELATIVE_HRS = 24 * 365 * 10;

const TIMELINE_LABEL = 'Investigate in Timeline';

/**
 * The expanded raw records are a trailing control column with a hidden header,
 * rendered outside the row's cell flexbox by the custom grid body.
 * @see https://eui.elastic.co/docs/components/tabular-content/data-grid/advanced/custom-body-rendering/
 */
const ROW_DETAILS_ID = 'row-details';
const EXPANDER_ID = 'expand';
const ACTIONS_ID = 'actions';

const EXPANDER_WIDTH = 36;
const ACTIONS_WIDTH = 60;

/**
 * Rows draw their own bottom border so the line falls under the expanded raw
 * records rather than between them and the entity they belong to.
 */
const gridStyle: EuiDataGridStyle = {
  border: 'none',
  cellPadding: 'l',
  stripes: false,
  header: 'underline',
};

const rowHeightsOptions: EuiDataGridRowHeightsOptions = { defaultHeight: 44 };
const detailsRowHeightsOptions: EuiDataGridRowHeightsOptions = { defaultHeight: 'auto' };
const detailsCellStyle: CSSProperties = { width: '100%', height: 'auto' };

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const ROW_TYPE_LABEL = 'entities';
const INSPECT_TITLE = 'Entities';

const GROUPING_ID = 'entity-analytics-facelift-entities';

const GROUPING_OPTIONS: GroupOption[] = [
  { label: 'Resolution', key: ENTITY_GROUPING_OPTIONS.RESOLUTION },
  { label: 'Entity type', key: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE },
];

/** The resolved view is already grouped by resolution, so the selector starts at None. */
const INITIAL_GROUPINGS = {
  groupById: {
    [GROUPING_ID]: {
      activeGroups: [ENTITY_GROUPING_OPTIONS.NONE],
      options: GROUPING_OPTIONS,
    },
  },
};

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

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

/** First contributing source, with the rest behind a badge. */
const SourcesCell: React.FC<{ sources: string[] }> = ({ sources }) => {
  const [isOpen, setIsOpen] = useState(false);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const [first, ...rest] = sources;
  if (!first) return getEmptyTagValue();

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s" className="eui-textTruncate">
          {first}
        </EuiText>
      </EuiFlexItem>
      {rest.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isOpen}
            closePopover={closePopover}
            anchorPosition="downCenter"
            panelPaddingSize="s"
            button={
              <EuiBadge
                color="hollow"
                onClick={togglePopover}
                onClickAriaLabel={`Show all ${sources.length} sources`}
                data-test-subj="eaFaceliftSourcesBadge"
              >
                {`+${rest.length}`}
              </EuiBadge>
            }
          >
            <EuiText size="s">{sources.join(', ')}</EuiText>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/** Positive change = worse (danger, sort up); negative = better (success, sort down). */
const RiskChangeCell: React.FC<{ percent: number }> = ({ percent }) => {
  if (percent === 0) {
    return (
      <EuiText size="s">
        <EuiTextColor color="subdued">{'—'}</EuiTextColor>
      </EuiText>
    );
  }

  const worse = percent > 0;
  return (
    <EuiText size="s">
      <EuiTextColor color={worse ? 'danger' : 'success'}>
        <EuiIcon type={worse ? 'sortUp' : 'sortDown'} size="s" aria-hidden={true} />
        {` ${Math.abs(percent)}%`}
      </EuiTextColor>
    </EuiText>
  );
};

const AlertsCell: React.FC<{ counts: AlertSeverityCounts; total: number }> = ({
  counts,
  total,
}) => {
  const { euiTheme } = useEuiTheme();

  if (total === 0) return getEmptyTagValue();

  const stats = ALERT_SEVERITIES.filter((severity) => counts[severity] > 0).map((severity) => ({
    key: capitalize(severity),
    count: counts[severity],
    color: getSeverityColor(severity, euiTheme),
  }));

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <DistributionBar stats={stats} hideLastTooltip />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{total}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const InvestigateInTimelineCell: React.FC<{ name: string; entityType: EntityType }> = ({
  name,
  entityType,
}) => {
  const { investigateInTimeline } = useInvestigateInTimeline();

  const onClick = useCallback(() => {
    const dataProviders = createDataProviders({
      contextId: ENTITY_ANALYTICS_TABLE_ID,
      field: EntityTypeToIdentifierField[entityType] || 'entity.id',
      values: name,
    });
    if (dataProviders?.length) {
      investigateInTimeline({ dataProviders });
    }
  }, [entityType, name, investigateInTimeline]);

  return (
    <EuiToolTip content={TIMELINE_LABEL} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="timeline"
        color="text"
        aria-label={TIMELINE_LABEL}
        onClick={onClick}
        data-test-subj="eaFaceliftTimelineAction"
      />
    </EuiToolTip>
  );
};

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const SHARED_COLUMNS: EuiDataGridColumn[] = [
  { id: 'name', displayAsText: 'Entity name', initialWidth: 220, isExpandable: false },
  { id: 'entityType', displayAsText: 'Entity type', initialWidth: 120, isExpandable: false },
  { id: 'sources', displayAsText: 'Source', initialWidth: 170, isExpandable: false },
  { id: 'riskScore', displayAsText: 'Risk score', initialWidth: 120, isExpandable: false },
  {
    id: 'riskChangePercent',
    displayAsText: 'Risk score change',
    initialWidth: 150,
    isExpandable: false,
  },
  { id: 'criticality', displayAsText: 'Asset criticality', initialWidth: 160, isExpandable: false },
  { id: 'alerts', displayAsText: 'Alerts', initialWidth: 180, isExpandable: false },
  { id: 'lastSeen', displayAsText: 'Last seen', initialWidth: 140, isExpandable: false },
];

const RESOLVED_COLUMNS: EuiDataGridColumn[] = [
  SHARED_COLUMNS[0],
  SHARED_COLUMNS[1],
  { id: 'records', displayAsText: 'Records', initialWidth: 90, isExpandable: false },
  ...SHARED_COLUMNS.slice(2),
];

const RAW_COLUMNS: EuiDataGridColumn[] = [
  SHARED_COLUMNS[0],
  SHARED_COLUMNS[1],
  { id: 'resolvedTo', displayAsText: 'Resolved to', initialWidth: 180, isExpandable: false },
  ...SHARED_COLUMNS.slice(2),
];

const columnsForView = (view: TableView): EuiDataGridColumn[] =>
  view === 'resolved' ? RESOLVED_COLUMNS : RAW_COLUMNS;

const columnIdsForView = (view: TableView): string[] => columnsForView(view).map(({ id }) => id);

interface RenderValueOptions {
  onOpenDetails?: (row: EntityRow) => void;
  onOpenResolvedTo?: (target: ResolvedToTarget) => void;
}

/**
 * Shared by both table views and by the nested raw records under a resolved
 * entity, so an expanded group reads as the same columns one level down.
 */
const renderValue = (
  columnId: string,
  row: EntityRow | RawRecordRow,
  { onOpenDetails, onOpenResolvedTo }: RenderValueOptions = {}
): ReactNode => {
  switch (columnId) {
    case 'name':
      return (
        <EuiText size="s" className="eui-textTruncate" title={row.name}>
          {onOpenDetails ? (
            <EuiLink
              onClick={() => onOpenDetails(row)}
              data-test-subj={`eaFaceliftEntityName-${row.id}`}
            >
              {row.name}
            </EuiLink>
          ) : (
            row.name
          )}
        </EuiText>
      );
    case 'entityType':
      return <EntityTypeCell entityType={row.entityType} />;
    case 'records':
      return <EuiText size="s">{row.records}</EuiText>;
    case 'resolvedTo': {
      const target = 'resolvedTo' in row ? row.resolvedTo : undefined;
      if (!target) {
        return (
          <EuiText size="s">
            <EuiTextColor color="subdued">{'—'}</EuiTextColor>
          </EuiText>
        );
      }
      return (
        <EuiText size="s" className="eui-textTruncate" title={target.name}>
          {onOpenResolvedTo ? (
            <EuiLink
              onClick={() => onOpenResolvedTo(target)}
              data-test-subj={`eaFaceliftResolvedTo-${row.id}`}
            >
              {target.name}
            </EuiLink>
          ) : (
            target.name
          )}
        </EuiText>
      );
    }
    case 'sources':
      return <SourcesCell sources={row.sources} />;
    case 'riskScore':
      return <RiskScoreCell riskScore={row.riskScore} />;
    case 'riskChangePercent':
      return <RiskChangeCell percent={row.riskChangePercent} />;
    case 'criticality':
      return <AssetCriticalityBadge criticalityLevel={row.criticality} />;
    case 'alerts':
      return <AlertsCell counts={row.alertsBySeverity} total={row.alerts} />;
    case 'lastSeen':
      return (
        <EuiText size="s">
          <FormattedRelativePreferenceDate
            value={row.lastSeen}
            relativeThresholdInHrs={ALWAYS_RELATIVE_HRS}
          />
        </EuiText>
      );
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

const sortValue = (row: EntityRow | RawRecordRow, columnId: string): string | number => {
  switch (columnId) {
    case 'name':
      return row.name.toLowerCase();
    case 'entityType':
      return row.entityType;
    case 'records':
      return row.records;
    case 'resolvedTo':
      return ('resolvedTo' in row ? row.resolvedTo?.name : undefined)?.toLowerCase() ?? '';
    case 'sources':
      return row.sources.join(', ').toLowerCase();
    case 'riskScore':
      return row.riskScore;
    case 'riskChangePercent':
      return row.riskChangePercent;
    case 'criticality':
      return CRITICALITY_RANK.indexOf(row.criticality);
    case 'alerts':
      return row.alerts;
    case 'lastSeen':
      return row.lastSeen;
    default:
      return 0;
  }
};

const sortRows = <T extends EntityRow>(
  rows: T[],
  sortingColumns: EuiDataGridColumnSortingConfig[]
): T[] => {
  if (sortingColumns.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const { id, direction } of sortingColumns) {
      const left = sortValue(a, id);
      const right = sortValue(b, id);
      if (left === right) continue;
      const order = left < right ? -1 : 1;
      return direction === 'asc' ? order : -order;
    }
    return 0;
  });
};

// ---------------------------------------------------------------------------
// Expanded raw records
// ---------------------------------------------------------------------------

/**
 * The nested rows sit inside a full-width cell, so they can't inherit the
 * grid's column widths. Measuring the header keeps them aligned through column
 * resizing, hiding and reordering.
 */
const useHeaderCellWidths = (
  containerRef: React.RefObject<HTMLDivElement>,
  dependencies: unknown[]
): number[] => {
  const [widths, setWidths] = useState<number[]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const cells = container.querySelectorAll<HTMLElement>(
        '.euiDataGridHeader .euiDataGridHeaderCell'
      );
      const next = Array.from(cells, (cell) => cell.getBoundingClientRect().width);
      setWidths((current) =>
        current.length === next.length && current.every((width, i) => width === next[i])
          ? current
          : next
      );
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container
      .querySelectorAll<HTMLElement>('.euiDataGridHeader .euiDataGridHeaderCell')
      .forEach((cell) => observer.observe(cell));

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, ...dependencies]);

  return widths;
};

interface RawRecordsProps {
  records: EntityRow[];
  columnIds: string[];
  /** Header widths in visible order: expander, actions, then the data columns. */
  columnWidths: number[];
  canUseTimeline: boolean;
  onOpenDetails: (row: EntityRow) => void;
}

const RawRecords: React.FC<RawRecordsProps> = ({
  records,
  columnIds,
  columnWidths,
  canUseTimeline,
  onOpenDetails,
}) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => ({
      panel: css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        border-block-start: ${euiTheme.border.thin};
      `,
      row: css`
        display: flex;
        align-items: center;
        min-block-size: 36px;

        &:not(:last-of-type) {
          border-block-end: ${euiTheme.border.thin};
        }
      `,
      cell: css`
        flex: 0 0 auto;
        overflow: hidden;
        padding-inline: ${euiTheme.size.s};
      `,
      /** The child marker reads better centered under the expander above it. */
      marker: css`
        display: flex;
        justify-content: center;
        transform: scaleX(-1);
      `,
    }),
    [euiTheme]
  );

  const leadingCount = canUseTimeline ? 2 : 1;

  return (
    <div css={styles.panel} data-test-subj="eaFaceliftRawRecords">
      {records.map((record) => (
        <div css={styles.row} key={record.id} data-test-subj="eaFaceliftRawRecordRow">
          <div
            css={[styles.cell, styles.marker]}
            style={{ width: columnWidths[0] ?? EXPANDER_WIDTH }}
          >
            <EuiIcon type="return" size="s" color="subdued" aria-hidden={true} />
          </div>
          {canUseTimeline && (
            <div css={styles.cell} style={{ width: columnWidths[1] ?? ACTIONS_WIDTH }}>
              <InvestigateInTimelineCell name={record.name} entityType={record.entityType} />
            </div>
          )}
          {columnIds.map((columnId, index) => (
            <div
              css={styles.cell}
              key={columnId}
              style={{ width: columnWidths[leadingCount + index] }}
            >
              {renderValue(columnId, record, {
                onOpenDetails: columnId === 'name' ? onOpenDetails : undefined,
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

type RawRecordsCellProps = RawRecordsProps & Pick<EuiDataGridCellValueElementProps, 'setCellProps'>;

/** The row details cell is declared 0 wide, so it has to claim the row itself. */
const RawRecordsCell: React.FC<RawRecordsCellProps> = ({ setCellProps, ...rest }) => {
  useEffect(() => {
    setCellProps({ style: detailsCellStyle });
  }, [setCellProps]);

  return <RawRecords {...rest} />;
};

// ---------------------------------------------------------------------------
// Custom grid body
// ---------------------------------------------------------------------------

type CustomGridBodyProps = EuiDataGridCustomBodyProps & {
  rows: EntityRow[];
  expandedIds: string[];
  /** Rendered under the header when there is nothing to show. */
  emptyMessage?: string;
};

const CustomGridBody = memo<CustomGridBodyProps>(
  ({
    Cell,
    visibleColumns,
    visibleRowData,
    setCustomGridBodyProps,
    headerRow,
    footerRow,
    rows,
    expandedIds,
    emptyMessage,
  }) => {
    const { euiTheme } = useEuiTheme();

    const styles = useMemo(
      () => ({
        row: css`
          inline-size: fit-content;
          min-inline-size: 100%;
          border-block-end: ${euiTheme.border.thin};
          background-color: ${euiTheme.colors.emptyShade};
        `,
        cells: css`
          display: flex;
        `,
        details: css`
          /* Extra specificity needed to override EuiDataGrid's default styles */
          && .euiDataGridRowCell__content {
            display: block;
            padding: 0;
          }
        `,
        empty: css`
          padding: ${euiTheme.size.xl};
          text-align: center;
          color: ${euiTheme.colors.textSubdued};
        `,
      }),
      [euiTheme]
    );

    const bodyRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      setCustomGridBodyProps({ ref: bodyRef });
    }, [setCustomGridBodyProps]);

    const visibleRows = rows.slice(visibleRowData.startRow, visibleRowData.endRow);

    return (
      <>
        {headerRow}
        {visibleRows.map((row, rowIndex) => (
          <div role="row" css={styles.row} key={row.id}>
            <div css={styles.cells}>
              {visibleColumns.map((column, colIndex) =>
                column.id === ROW_DETAILS_ID ? null : (
                  <Cell
                    colIndex={colIndex}
                    visibleRowIndex={rowIndex}
                    key={`${row.id},${column.id}`}
                  />
                )
              )}
            </div>
            {expandedIds.includes(row.id) && (
              <div css={styles.details}>
                <Cell
                  colIndex={visibleColumns.length - 1}
                  visibleRowIndex={rowIndex}
                  rowHeightsOptions={detailsRowHeightsOptions}
                />
              </div>
            )}
          </div>
        ))}
        {emptyMessage && visibleRows.length === 0 && (
          <div css={styles.empty} data-test-subj="eaFaceliftResolvedEntitiesEmpty">
            {emptyMessage}
          </div>
        )}
        {footerRow}
      </>
    );
  }
);
CustomGridBody.displayName = 'CustomGridBody';

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export interface ResolvedEntitiesGridProps {
  /** The page's ES query, so the rows follow the KQL bar and the overview band. */
  query?: unknown;
  view: TableView;
}

export const ResolvedEntitiesGrid: React.FC<ResolvedEntitiesGridProps> = ({ query, view }) => {
  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openFlyout } = useExpandableFlyoutApi();
  const { openEntityFlyout } = useFlyoutApi();
  const { dataView, dataViewIsLoading } = useContext(DataViewContext);
  const { setQuery, deleteQuery } = useGlobalTime();

  const containerRef = useRef<HTMLDivElement>(null);
  const isResolvedView = view === 'resolved';

  const columns = useMemo(() => columnsForView(view), [view]);
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() => columnIdsForView(view));
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridColumnSortingConfig[]>([
    { id: 'riskScore', direction: 'desc' },
  ]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  // Column sets differ between views; reset visibility, sort, and expansions.
  useEffect(() => {
    const available = new Set(columnIdsForView(view));
    setVisibleColumnIds(columnIdsForView(view));
    setExpandedIds([]);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setSortingColumns((current) => {
      const next = current.filter((column) => available.has(column.id));
      return next.length > 0 ? next : [{ id: 'riskScore', direction: 'desc' }];
    });
  }, [view]);

  const rows = useMemo(
    () =>
      isResolvedView
        ? sortRows(getResolvedEntities(query), sortingColumns)
        : sortRows(getRawRecords(query), sortingColumns),
    [isResolvedView, query, sortingColumns]
  );

  const [lastUpdatedAt, setLastUpdatedAt] = useState(Date.now());
  useEffect(() => setLastUpdatedAt(Date.now()), [query]);

  // The rows are filtered client-side, so Inspect shows the query they were
  // filtered with rather than a request that went to Elasticsearch.
  const inspect = useMemo(
    () => ({
      dsl: [JSON.stringify({ query }, null, 2)],
      response: [JSON.stringify({ hits: { total: rows.length } }, null, 2)],
    }),
    [query, rows.length]
  );

  useQueryInspector({
    queryId: ENTITY_ANALYTICS_TABLE_ID,
    loading: false,
    refetch: noop,
    inspect,
    setQuery,
    deleteQuery,
  });

  const grouping = useGrouping({
    componentProps: {},
    defaultGroupingOptions: GROUPING_OPTIONS,
    initialGroupings: INITIAL_GROUPINGS,
    fields: dataViewIsLoading ? [] : dataView.fields,
    groupingId: GROUPING_ID,
    title: 'Group entities by',
  });

  // A narrower filter can leave the grid on a page that no longer exists.
  const pageIndex = Math.min(
    pagination.pageIndex,
    Math.max(Math.ceil(rows.length / pagination.pageSize) - 1, 0)
  );

  const onChangePage = useCallback(
    (nextPageIndex: number) =>
      setPagination((current) => ({ ...current, pageIndex: nextPageIndex })),
    []
  );
  const onChangeItemsPerPage = useCallback(
    (pageSize: number) => setPagination({ pageIndex: 0, pageSize }),
    []
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((openId) => openId !== id) : [...current, id]
    );
  }, []);

  const openEntityDetails = useCallback(
    ({
      entityId,
      name,
      entityType,
    }: {
      entityId: string;
      name: string;
      entityType: EntityType;
    }) => {
      const sharedParams = {
        entityId,
        contextID: ENTITY_ANALYTICS_TABLE_ID,
        scopeId: ENTITY_ANALYTICS_TABLE_ID,
      };

      if (enableNewFlyout) {
        openEntityFlyout({
          engineType: entityType,
          entityName: name,
          origin: FLYOUT_ORIGIN.ENTITIES_TABLE,
          ...sharedParams,
        });
        return;
      }

      const panelKey = EntityPanelKeyByType[entityType];
      const paramName = EntityPanelParamByType[entityType];
      if (panelKey && paramName) {
        openFlyout({
          right: { id: panelKey, params: { [paramName]: name, ...sharedParams } },
        });
      }
    },
    [enableNewFlyout, openEntityFlyout, openFlyout]
  );

  const onOpenDetails = useCallback(
    (row: EntityRow) =>
      openEntityDetails({
        entityId: row.entityId,
        name: row.name,
        entityType: row.entityType,
      }),
    [openEntityDetails]
  );

  /** Opens the resolved identity a raw record belongs to. */
  const onOpenResolvedTo = useCallback(
    (target: ResolvedToTarget) =>
      openEntityDetails({
        entityId: target.id,
        name: target.name,
        entityType: target.entityType,
      }),
    [openEntityDetails]
  );

  const columnWidths = useHeaderCellWidths(containerRef, [visibleColumnIds, rows.length]);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const row = rows[rowIndex];
      if (!row) return null;
      return renderValue(columnId, row, {
        onOpenDetails: columnId === 'name' ? onOpenDetails : undefined,
        onOpenResolvedTo: columnId === 'resolvedTo' ? onOpenResolvedTo : undefined,
      });
    },
    [rows, onOpenDetails, onOpenResolvedTo]
  );

  const leadingControlColumns = useMemo<EuiDataGridControlColumn[]>(() => {
    const actions: EuiDataGridControlColumn | undefined = canUseTimeline
      ? {
          id: ACTIONS_ID,
          width: ACTIONS_WIDTH,
          headerCellRender: () => <span>{'Actions'}</span>,
          rowCellRender: ({ rowIndex }) => {
            const row = rows[rowIndex];
            if (!row) return null;
            return <InvestigateInTimelineCell name={row.name} entityType={row.entityType} />;
          },
        }
      : undefined;

    if (!isResolvedView) {
      return actions ? [actions] : [];
    }

    const expander: EuiDataGridControlColumn = {
      id: EXPANDER_ID,
      width: EXPANDER_WIDTH,
      headerCellRender: () => (
        <EuiScreenReaderOnly>
          <span>{'Expand rows'}</span>
        </EuiScreenReaderOnly>
      ),
      rowCellRender: ({ rowIndex }) => {
        const row = rows[rowIndex] as ResolvedEntityRow | undefined;
        if (!row) return null;

        const isExpanded = expandedIds.includes(row.id);
        return (
          <EuiButtonIcon
            size="xs"
            color="text"
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            aria-label={isExpanded ? `Collapse ${row.name} records` : `Expand ${row.name} records`}
            aria-expanded={isExpanded}
            onClick={() => toggleExpanded(row.id)}
            data-test-subj={`eaFaceliftExpandRow-${row.id}`}
          />
        );
      },
    };

    return actions ? [expander, actions] : [expander];
  }, [rows, expandedIds, toggleExpanded, canUseTimeline, isResolvedView]);

  const trailingControlColumns = useMemo<EuiDataGridControlColumn[] | undefined>(() => {
    if (!isResolvedView) return undefined;

    return [
      {
        id: ROW_DETAILS_ID,
        width: 0,
        headerCellRender: () => <>{'Raw records'}</>,
        headerCellProps: { className: 'euiScreenReaderOnly' },
        footerCellProps: { style: { display: 'none' } },
        rowCellRender: ({ rowIndex, setCellProps }) => {
          const row = rows[rowIndex] as ResolvedEntityRow | undefined;
          if (!row || !expandedIds.includes(row.id)) return null;

          return (
            <RawRecordsCell
              setCellProps={setCellProps}
              records={row.rawRecords}
              columnIds={visibleColumnIds}
              columnWidths={columnWidths}
              canUseTimeline={canUseTimeline}
              onOpenDetails={onOpenDetails}
            />
          );
        },
      },
    ];
  }, [
    isResolvedView,
    rows,
    expandedIds,
    visibleColumnIds,
    columnWidths,
    canUseTimeline,
    onOpenDetails,
  ]);

  const emptyMessage =
    rows.length === 0
      ? isResolvedView
        ? 'No entities match the current filters'
        : 'No records match the current filters'
      : undefined;

  const renderCustomGridBody = useCallback(
    (props: EuiDataGridCustomBodyProps) => (
      <CustomGridBody
        {...props}
        rows={rows}
        expandedIds={isResolvedView ? expandedIds : []}
        emptyMessage={emptyMessage}
      />
    ),
    [rows, isResolvedView, expandedIds, emptyMessage]
  );

  const onAddColumn = useCallback(
    (columnId: string) => {
      const available = columnIdsForView(view);
      setVisibleColumnIds((current) =>
        current.includes(columnId) || !available.includes(columnId)
          ? current
          : [...current, columnId]
      );
    },
    [view]
  );

  const onRemoveColumn = useCallback((columnId: string) => {
    setVisibleColumnIds((current) => current.filter((id) => id !== columnId));
  }, []);

  const onResetColumns = useCallback(() => setVisibleColumnIds(columnIdsForView(view)), [view]);

  const toolbarVisibility = useMemo(
    () => ({
      additionalControls: {
        left: {
          prepend: (
            <AdditionalControls
              total={rows.length}
              title={isResolvedView ? ROW_TYPE_LABEL : 'records'}
              columns={visibleColumnIds}
              onAddColumn={onAddColumn}
              onRemoveColumn={onRemoveColumn}
              onResetColumns={onResetColumns}
            />
          ),
        },
        right: (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <InspectButton queryId={ENTITY_ANALYTICS_TABLE_ID} title={INSPECT_TITLE} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LastUpdated updatedAt={lastUpdatedAt} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{grouping.groupSelector}</EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    }),
    [
      rows.length,
      isResolvedView,
      visibleColumnIds,
      onAddColumn,
      onRemoveColumn,
      onResetColumns,
      lastUpdatedAt,
      grouping.groupSelector,
    ]
  );

  const { euiTheme } = useEuiTheme();

  return (
    <div
      ref={containerRef}
      data-test-subj={
        isResolvedView ? 'eaFaceliftResolvedEntitiesGrid' : 'eaFaceliftRawRecordsGrid'
      }
      css={css`
        /* Same treatment as the production Entities table toolbar count. */
        .entityAnalyticsDataTableTotal {
          font-size: ${euiTheme.size.m};
          font-weight: ${euiTheme.font.weight.bold};
          border-right: ${euiTheme.border.thin};
          margin-inline-start: 0;
          margin-inline-end: ${euiTheme.size.s};
          padding-right: ${euiTheme.size.m};
        }

        /* Data cells inherit the row height, so their content needs centering. */
        .euiDataGridRowCell__content--defaultHeight {
          align-content: center;
        }

        /* Control columns size to their content instead, and start-align it. */
        .euiDataGridRowCell--controlColumn .euiDataGridRowCell__content {
          block-size: 100%;
          align-items: center;
        }
      `}
    >
      <EuiDataGrid
        aria-label={isResolvedView ? 'Resolved entities' : 'Raw records'}
        columns={columns}
        columnVisibility={{
          visibleColumns: visibleColumnIds,
          setVisibleColumns: setVisibleColumnIds,
        }}
        leadingControlColumns={leadingControlColumns}
        trailingControlColumns={trailingControlColumns}
        rowCount={rows.length}
        renderCellValue={renderCellValue}
        renderCustomGridBody={renderCustomGridBody}
        sorting={{ columns: sortingColumns, onSort: setSortingColumns }}
        pagination={
          rows.length > 0
            ? {
                pageIndex,
                pageSize: pagination.pageSize,
                pageSizeOptions: PAGE_SIZE_OPTIONS,
                onChangePage,
                onChangeItemsPerPage,
              }
            : undefined
        }
        toolbarVisibility={toolbarVisibility}
        rowHeightsOptions={rowHeightsOptions}
        gridStyle={gridStyle}
      />
    </div>
  );
};
