/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';
import type {
  EuiDataGridColumn,
  EuiDataGridCustomBodyProps,
  EuiDataGridStyleCellPaddings,
  EuiThemeComputed,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { renderEntityCell } from './entities_cell_renderer';
import type { CellHandlers } from './entities_cell_renderer';
import { useEntityGridData } from './hooks/use_entity_grid_data';
import type { UseEntityGridDataOptions } from './hooks/use_entity_grid_data';
import {
  ENTITY_ID_FIELD,
  GROUP_SIZE_FIELD,
  RESOLVED_TO_FIELD,
  RISK_SCORE_NORM_FIELD,
  getEntityId,
} from './common';
import { esc } from './queries/esql';
import type { TimeRange } from './common';

/** Most records an expanded group shows. */
const MAX_GROUP_RECORDS = 100;

const truncatedGroupLabel = (shown: number, total: number) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.home.grid.truncatedGroupLabel', {
    defaultMessage: 'Showing {shown} of {total} records',
    values: { shown, total },
  });

/**
 * Grid options of a group's records: its target and the entities resolved to it, as
 * individual rows. Expanding is structural, so the table filters don't apply.
 */
export const groupRecordsOptions = (
  entityId: string,
  timeRange: TimeRange,
  keepFields: readonly string[]
): UseEntityGridDataOptions => ({
  keyScope: 'children',
  rowsMode: 'individual',
  entityExpression: `(${ENTITY_ID_FIELD} == ${esc(entityId)} OR ${RESOLVED_TO_FIELD} == ${esc(
    entityId
  )})`,
  sortField: RISK_SCORE_NORM_FIELD,
  sortDirection: 'desc',
  pageIndex: 0,
  pageSize: MAX_GROUP_RECORDS,
  timeRange,
  keepFields,
});

interface ChildTreeConnectorProps {
  isLast: boolean;
  euiTheme: EuiThemeComputed;
}

interface ExpandedEntityRowProps {
  child: Record<string, unknown>;
  isLast: boolean;
  /** The child is not enriched yet; enrich cells stay blank until it is. */
  isEnriching: boolean;
  /** Grid density, so child rows match the height of grid rows. */
  cellPadding: EuiDataGridStyleCellPaddings;
  visCols: EuiDataGridCustomBodyProps['visibleColumns'];
  columns: EuiDataGridColumn[];
  euiTheme: EuiThemeComputed;
  watchlistNames: Map<string, string>;
  handlers?: CellHandlers;
}

/** EUI grid row heights for the compact (s), normal (m) and expanded (l) densities. */
const ROW_HEIGHT_PX: Record<EuiDataGridStyleCellPaddings, number> = { s: 25, m: 37, l: 41 };

const cellPaddingBlock = (
  euiTheme: EuiThemeComputed,
  cellPadding: EuiDataGridStyleCellPaddings
): string => {
  if (cellPadding === 's') return euiTheme.size.xs;
  if (cellPadding === 'l') return euiTheme.size.s;
  return '6px';
};

const ExpandedEntityRow: React.FC<ExpandedEntityRowProps> = ({
  child,
  isLast,
  isEnriching,
  cellPadding,
  visCols,
  columns,
  euiTheme,
  watchlistNames,
  handlers,
}) => {
  const paddingBlock = cellPaddingBlock(euiTheme, cellPadding);
  return (
    <div
      role="row"
      className="euiDataGridRow"
      css={css`
        inline-size: fit-content;
        min-inline-size: 100%;
        height: ${ROW_HEIGHT_PX[cellPadding]}px;
        background: ${euiTheme.colors.body};
      `}
    >
      <div
        css={css`
          display: flex;
          height: 100%;
        `}
      >
        {visCols.map((col) => {
          const colDef = columns.find((c) => c.id === col.id);
          if (!colDef) {
            const width = 'width' in col && typeof col.width === 'number' ? col.width : 36;
            return <div key={col.id} style={{ width, flexShrink: 0 }} />;
          }

          const w = colDef.initialWidth ?? 150;
          const value = child[col.id];

          if (col.id === 'entity.name') {
            return (
              <div
                key={col.id}
                role="gridcell"
                style={{ width: w, flexShrink: 0, overflow: 'hidden' }}
              >
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    height: 100%;
                    overflow: hidden;
                  `}
                >
                  <ExpandedEntityTreeConnector isLast={isLast} euiTheme={euiTheme} />
                  <div
                    title={typeof value === 'string' ? value : undefined}
                    css={css`
                      flex: 1;
                      min-width: 0;
                      overflow: hidden;
                      padding: ${paddingBlock} ${euiTheme.size.m} ${paddingBlock}
                        ${euiTheme.size.xs};
                    `}
                  >
                    {renderEntityCell(
                      col.id,
                      value,
                      child,
                      watchlistNames,
                      euiTheme,
                      handlers,
                      isEnriching
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={col.id}
              role="gridcell"
              style={{
                width: w,
                flexShrink: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
              }}
              css={css`
                padding: ${paddingBlock};
              `}
            >
              {renderEntityCell(
                col.id,
                value,
                child,
                watchlistNames,
                euiTheme,
                handlers,
                isEnriching
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ExpandedEntityTreeConnector: React.FC<ChildTreeConnectorProps> = ({ isLast, euiTheme }) => (
  <div
    css={css`
      width: 20px;
      align-self: stretch;
      position: relative;
      flex-shrink: 0;
    `}
  >
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
  extends Omit<ExpandedEntityRowProps, 'child' | 'isLast' | 'isEnriching'> {
  entityId: string;
  timeRange: TimeRange;
  keepFields: readonly string[];
}

/** The records of an expanded group, under its row. */
export const ExpandedEntityGroup: React.FC<ExpandedEntityGroupProps> = ({
  entityId,
  timeRange,
  keepFields,
  ...rowProps
}) => {
  const {
    rows: records,
    isEnriching,
    total,
  } = useEntityGridData(groupRecordsOptions(entityId, timeRange, keepFields));
  // Child rows show the parent grid's columns, Records included: each is one record.
  const rows = useMemo(
    () => records.map((record) => ({ ...record, [GROUP_SIZE_FIELD]: 1 })),
    [records]
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
          {...rowProps}
        />
      ))}
      {total > rows.length && rows.length > 0 && (
        <div
          role="row"
          css={css`
            background: ${euiTheme.colors.body};
            padding: ${cellPaddingBlock(euiTheme, cellPadding)} ${euiTheme.size.xl};
          `}
        >
          <EuiText size="xs" color="subdued">
            {truncatedGroupLabel(rows.length, total)}
          </EuiText>
        </div>
      )}
    </>
  );
};
