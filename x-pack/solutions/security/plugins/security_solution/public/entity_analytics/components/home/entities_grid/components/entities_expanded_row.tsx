/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiScreenReaderOnly, EuiText, EuiToolTip } from '@elastic/eui';
import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridCustomBodyProps,
  EuiDataGridStyleCellPaddings,
  EuiThemeComputed,
} from '@elastic/eui';
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
import { useEntityGridData } from '../hooks/use_entity_grid_data';
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

const getTruncatedGroupLabel = (shown: number, total: number) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.home.grid.getTruncatedGroupLabel', {
    defaultMessage: 'Showing {shown} of {total} records',
    values: { shown, total },
  });

/** A group's records as individual rows; expanding is structural, so the table filters don't apply. */
export const getGroupRecordsOptions = (
  entityId: string,
  timeRange: TimeRange,
  keepFields: readonly string[]
): UseEntityGridDataOptions => ({
  keyScope: 'children',
  rowsMode: 'individual',
  entityExpression: `(${ENTITY_ID_FIELD} == ${escapeStringValue(
    entityId
  )} OR ${RESOLVED_TO_FIELD} == ${escapeStringValue(entityId)})`,
  sortField: RISK_SCORE_NORM_FIELD,
  sortDirection: 'desc',
  pageSize: MAX_GROUP_RECORDS,
  timeRange,
  keepFields,
});

interface ExpandedEntityRowProps {
  child: Row;
  isLast: boolean;
  /** The child is not enriched yet; enrich cells stay blank until it is. */
  isEnriching: boolean;
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
  extends Omit<ExpandedEntityRowProps, 'child' | 'isLast' | 'isEnriching' | 'columnsById'> {
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
  const {
    rows: records,
    isEnriching,
    total,
  } = useEntityGridData(getGroupRecordsOptions(entityId, timeRange, keepFields));
  // Child rows show the parent grid's columns, Records included: each is one record.
  const rows = useMemo(
    () => records.map((record) => ({ ...record, [GROUP_SIZE_FIELD]: 1 })),
    [records]
  );
  const columnsById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns]
  );
  const { euiTheme, cellPadding } = rowProps;
  return (
    <>
      {rows.map((child, i) => (
        <ExpandedEntityRow
          key={getEntityId(child) ?? i}
          child={child}
          isLast={i === rows.length - 1}
          isEnriching={isEnriching}
          columnsById={columnsById}
          {...rowProps}
        />
      ))}
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
