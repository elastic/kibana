/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type {
  EuiDataGridColumn,
  EuiDataGridCustomBodyProps,
  EuiDataGridStyleCellPaddings,
  EuiThemeComputed,
} from '@elastic/eui';
import { renderEntityCell } from './entities_cell_renderer';
import type { CellHandlers } from './entities_cell_renderer';

interface ChildTreeConnectorProps {
  isLast: boolean;
  euiTheme: EuiThemeComputed;
}

interface ExpandedEntityRowProps {
  child: Record<string, unknown>;
  isLast: boolean;
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

export const ExpandedEntityRow: React.FC<ExpandedEntityRowProps> = ({
  child,
  isLast,
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
                    {renderEntityCell(col.id, value, child, watchlistNames, euiTheme, handlers)}
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
              {renderEntityCell(col.id, value, child, watchlistNames, euiTheme, handlers)}
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
