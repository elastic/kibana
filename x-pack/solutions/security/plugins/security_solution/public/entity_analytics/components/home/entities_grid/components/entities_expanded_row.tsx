/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiIconTip, EuiScreenReaderOnly, EuiText, EuiToolTip } from '@elastic/eui';
import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridCustomBodyProps,
  EuiDataGridStyleCellPaddings,
  EuiThemeComputed,
} from '@elastic/eui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { i18n } from '@kbn/i18n';
import { escapeStringValue } from '@kbn/esql-utils';
import { renderEntityCell } from './entities_cell_renderer';
import type { RowCellHandlers } from './entities_cell_renderer';
import { useEntityGridView } from './entities_grid_view_context';
import {
  ROW_HEIGHT_PX,
  getCellPaddingBlock,
  getColumnWidth,
  gridRowCellsCss,
  gridRowCss,
} from './entities_grid_styles';
import { TARGET_ENTITY_TOOLTIP } from '../../../entity_resolution/translations';
import { useEntityGridData } from '../hooks/use_entity_grid_data';
import { getSortedPage } from '../queries/esql';
import type { UseEntityGridDataOptions } from '../hooks/use_entity_grid_context';
import {
  ENTITY_ID_FIELD,
  GROUP_SIZE_FIELD,
  RESOLVED_TO_FIELD,
  RISK_SCORE_NORM_FIELD,
  getEntityId,
  getNumber,
} from '../common';
import type { Row, TimeRange } from '../common';

const MAX_GROUP_RECORDS = 100;

/** A large group scrolls within this many rows, so its parent row stays in view. */
const MAX_VISIBLE_GROUP_RECORDS = 10;

const getTruncatedGroupLabel = (shown: number, total: number) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.home.grid.getTruncatedGroupLabel', {
    defaultMessage: 'Showing {shown} of {total} records',
    values: { shown, total },
  });

const getRecordsOptions = (
  entityExpression: string,
  pageSize: number,
  timeRange: TimeRange,
  keepFields: readonly string[],
  columns: readonly EuiDataGridColumn[]
): UseEntityGridDataOptions => ({
  keyScope: 'children',
  rowsMode: 'individual',
  entityExpression,
  sortField: RISK_SCORE_NORM_FIELD,
  sortDirection: 'desc',
  pageSize,
  timeRange,
  keepFields,
  columnIds: columns.map(({ id }) => id),
});

/**
 * A group's records as individual rows; expanding is structural, so the table filters don't apply.
 * The main entity is read on its own, so a group of more than 100 records still shows it.
 */
export const getGroupRecordsOptions = (
  entityId: string,
  timeRange: TimeRange,
  keepFields: readonly string[],
  columns: readonly EuiDataGridColumn[]
): Record<'mainEntity' | 'aliases', UseEntityGridDataOptions> => ({
  mainEntity: getRecordsOptions(
    `${ENTITY_ID_FIELD} == ${escapeStringValue(entityId)}`,
    1,
    timeRange,
    keepFields,
    columns
  ),
  aliases: getRecordsOptions(
    `${RESOLVED_TO_FIELD} == ${escapeStringValue(entityId)}`,
    MAX_GROUP_RECORDS - 1,
    timeRange,
    keepFields,
    columns
  ),
});

interface ExpandedEntityRowProps {
  child: Row;
  isLast: boolean;
  /** The child is not enriched yet; enrich cells stay blank until it is. */
  isEnriching: boolean;
  isMainEntity: boolean;
  /** Grid density, so child rows match the height of grid rows. */
  cellPadding: EuiDataGridStyleCellPaddings;
  visCols: EuiDataGridCustomBodyProps['visibleColumns'];
  columnsById: ReadonlyMap<string, EuiDataGridColumn>;
  euiTheme: EuiThemeComputed;
  watchlistNames: Map<string, string>;
  handlers?: RowCellHandlers;
}

const placeholderCellCss = css`
  flex-shrink: 0;
`;

const columnCellCss = css`
  flex-shrink: 0;
  overflow: hidden;
`;

const valueCellCss = css`
  display: flex;
  align-items: center;
  white-space: nowrap;
`;

const fullHeightCss = css`
  height: 100%;
`;

const nameCellCss = css`
  display: flex;
  align-items: center;
  height: 100%;
  overflow: hidden;
`;

const nameContentCss = css`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const groupRecordsCss = css`
  overflow-y: auto;
  overscroll-behavior-y: contain;
`;

const groupRecordCss = css`
  position: absolute;
  min-inline-size: 100%;
`;

/** Records rendered above and below the visible ones, so fast scrolling rarely shows a gap. */
const OVERSCAN_GROUP_RECORDS = 10;

const mainEntityIconCss = css`
  flex-shrink: 0;
`;

const treeConnectorCss = css`
  width: 20px;
  align-self: stretch;
  position: relative;
  flex-shrink: 0;
`;

const ExpandedEntityRow: React.FC<ExpandedEntityRowProps> = ({
  child,
  isLast,
  isEnriching,
  isMainEntity,
  cellPadding,
  visCols,
  columnsById,
  euiTheme,
  watchlistNames,
  handlers,
}) => {
  const paddingBlock = getCellPaddingBlock(euiTheme, cellPadding);
  const rowCss = css`
    height: ${ROW_HEIGHT_PX[cellPadding]}px;
    background: ${euiTheme.colors.body};
  `;
  const valueCellPaddingCss = css`
    padding: ${paddingBlock};
  `;
  const nameContentPaddingCss = css`
    padding: ${paddingBlock} ${euiTheme.size.m} ${paddingBlock} ${euiTheme.size.xs};
  `;
  return (
    <div role="row" className="euiDataGridRow" css={[gridRowCss, rowCss]}>
      <div css={[gridRowCellsCss, fullHeightCss]}>
        {visCols.map((col) => {
          const w = getColumnWidth(col);
          if (!columnsById.has(col.id)) {
            return <div key={col.id} css={placeholderCellCss} style={{ width: w }} />;
          }

          const value = child[col.id];
          const cell = renderEntityCell(
            col.id,
            child,
            watchlistNames,
            euiTheme,
            handlers,
            isEnriching
          );

          if (col.id === 'entity.name') {
            return (
              <div key={col.id} role="gridcell" css={columnCellCss} style={{ width: w }}>
                <div css={nameCellCss}>
                  <ExpandedEntityTreeConnector isLast={isLast} euiTheme={euiTheme} />
                  <div
                    title={typeof value === 'string' ? value : undefined}
                    css={[nameContentCss, nameContentPaddingCss]}
                  >
                    {cell}
                  </div>
                  {isMainEntity && (
                    <EuiIconTip
                      content={TARGET_ENTITY_TOOLTIP}
                      type="aggregate"
                      size="s"
                      anchorProps={{ css: mainEntityIconCss }}
                      iconProps={{ 'data-test-subj': 'entityGridMainEntityIcon' }}
                    />
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={col.id}
              role="gridcell"
              css={[columnCellCss, valueCellCss, valueCellPaddingCss]}
              style={{ width: w }}
            >
              {cell}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ChildTreeConnectorProps {
  isLast: boolean;
  euiTheme: EuiThemeComputed;
}

const ExpandedEntityTreeConnector: React.FC<ChildTreeConnectorProps> = ({ isLast, euiTheme }) => (
  <div css={treeConnectorCss}>
    <div
      css={css`
        position: absolute;
        left: 8px;
        top: 0;
        bottom: ${isLast ? '50%' : '0'};
        width: 1px;
        background: ${euiTheme.border.color};
      `}
    />
    <div
      css={css`
        position: absolute;
        left: 8px;
        top: 50%;
        right: 0;
        height: 1px;
        background: ${euiTheme.border.color};
      `}
    />
  </div>
);

interface ExpandedEntityGroupProps
  extends Omit<
    ExpandedEntityRowProps,
    'child' | 'isLast' | 'isEnriching' | 'isMainEntity' | 'columnsById'
  > {
  columns: EuiDataGridColumn[];
  entityId: string;
  timeRange: TimeRange;
  keepFields: readonly string[];
}

export const ExpandedEntityGroup: React.FC<ExpandedEntityGroupProps> = ({
  entityId,
  timeRange,
  keepFields,
  columns,
  ...rowProps
}) => {
  const recordsOptions = useMemo(
    () => getGroupRecordsOptions(entityId, timeRange, keepFields, columns),
    [entityId, timeRange, keepFields, columns]
  );
  const mainEntity = useEntityGridData(recordsOptions.mainEntity);
  const aliases = useEntityGridData(recordsOptions.aliases);
  const isEnriching = mainEntity.isEnriching || aliases.isEnriching;
  const total = aliases.total == null ? undefined : aliases.total + mainEntity.rows.length;
  // Child rows show the parent grid's columns, Records included: each is one record.
  const rows = useMemo(
    () =>
      getSortedPage(
        { sort: { field: RISK_SCORE_NORM_FIELD, direction: 'desc' }, pageSize: MAX_GROUP_RECORDS },
        [...mainEntity.rows, ...aliases.rows]
      ).map((record) => ({ ...record, [GROUP_SIZE_FIELD]: 1 })),
    [mainEntity.rows, aliases.rows]
  );
  const columnsById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns]
  );
  const { euiTheme, cellPadding } = rowProps;
  const rowHeight = ROW_HEIGHT_PX[cellPadding];
  // Only the records in view render: rendering all 100 blocked the page on every update.
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN_GROUP_RECORDS,
  });
  return (
    <>
      <div
        ref={setScrollElement}
        css={css`
          ${groupRecordsCss}
          max-block-size: ${rowHeight * MAX_VISIBLE_GROUP_RECORDS}px;
          /* A record not rendered yet shows as an empty record, not as the page behind it. */
          background: ${euiTheme.colors.body};
        `}
      >
        <div style={{ blockSize: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(({ index, start }) => {
            const child = rows[index];
            return (
              <div
                key={getEntityId(child) ?? index}
                css={groupRecordCss}
                style={{ insetBlockStart: start }}
              >
                <ExpandedEntityRow
                  child={child}
                  isLast={index === rows.length - 1}
                  isEnriching={isEnriching}
                  isMainEntity={getEntityId(child) === entityId}
                  columnsById={columnsById}
                  {...rowProps}
                />
              </div>
            );
          })}
        </div>
      </div>
      {total != null && total > rows.length && rows.length > 0 && (
        <div
          role="row"
          css={css`
            background: ${euiTheme.colors.body};
            padding: ${getCellPaddingBlock(euiTheme, cellPadding)} ${euiTheme.size.xl};
          `}
        >
          <EuiText size="xs" color="subdued">
            {getTruncatedGroupLabel(rows.length, total)}
          </EuiText>
        </div>
      )}
    </>
  );
};

const EXPANDER_HEADER_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.expanderColumnAriaLabel',
  { defaultMessage: 'Expand group' }
);

const getExpandRowLabel = (isExpanded: boolean) =>
  isExpanded
    ? i18n.translate('xpack.securitySolution.entityAnalytics.home.grid.collapseRowAriaLabel', {
        defaultMessage: 'Collapse group',
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.home.grid.expandRowAriaLabel', {
        defaultMessage: 'Expand group',
      });

const EntityGridExpanderHeader = () => (
  <EuiScreenReaderOnly>
    <span>{EXPANDER_HEADER_LABEL}</span>
  </EuiScreenReaderOnly>
);

const EntityGridExpanderCell = ({ rowIndex }: EuiDataGridCellValueElementProps) => {
  const { rows, expandedIds, prefetchChildren, toggleExpandedId } = useEntityGridView();
  const row = rows[rowIndex];
  if (!row) return null;
  const entityId = getEntityId(row);
  const groupSize = getNumber(row, GROUP_SIZE_FIELD) ?? 1;
  if (!entityId || groupSize <= 1) return null;
  const isExpanded = expandedIds.has(entityId);
  const label = getExpandRowLabel(isExpanded);
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        size="xs"
        color="text"
        aria-label={label}
        iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
        onMouseEnter={() => prefetchChildren(entityId)}
        onFocus={() => prefetchChildren(entityId)}
        onClick={() => toggleExpandedId(entityId)}
      />
    </EuiToolTip>
  );
};

export const EXPANDER_COLUMN: EuiDataGridControlColumn = {
  id: 'expander',
  width: 36,
  headerCellRender: EntityGridExpanderHeader,
  rowCellRender: EntityGridExpanderCell,
};
