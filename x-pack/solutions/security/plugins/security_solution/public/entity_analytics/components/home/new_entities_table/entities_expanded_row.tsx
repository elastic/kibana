/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiDataGridCustomBodyProps, EuiDataGridColumn, EuiThemeComputed } from '@elastic/eui';
import { renderGridCell } from './entities_cell_renderer';
import type { CellHandlers } from './entities_cell_renderer';

interface ChildTreeConnectorProps {
  isLast: boolean;
  euiTheme: EuiThemeComputed;
}

interface ExpandedEntityRowProps {
  child: Record<string, unknown>;
  isLast: boolean;
  visCols: EuiDataGridCustomBodyProps['visibleColumns'];
  columns: EuiDataGridColumn[];
  euiTheme: EuiThemeComputed;
  watchlistNames: Map<string, string>;
  handlers?: CellHandlers;
}

export const ExpandedEntityRow: React.FC<ExpandedEntityRowProps> = ({
  child,
  isLast,
  visCols,
  columns,
  euiTheme,
  watchlistNames,
  handlers,
}) => (
  <div
    role="row"
    className="euiDataGridRow"
    css={css`
      inline-size: fit-content;
      min-inline-size: 100%;
      height: 37px; /* matches EUI normal density */
      background: ${euiTheme.colors.body};

      .euiDataGrid--paddingSmall & {
        height: 25px; /* EUI compact density */
      }

      .euiDataGrid--paddingLarge & {
        height: 41px; /* EUI expanded density */
      }
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
                    padding: 6px ${euiTheme.size.m} 6px ${euiTheme.size.xs};
                    .euiDataGrid--paddingSmall & {
                      padding: ${euiTheme.size.xs} ${euiTheme.size.m} ${euiTheme.size.xs}
                        ${euiTheme.size.xs};
                    }
                    .euiDataGrid--paddingLarge & {
                      padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.s}
                        ${euiTheme.size.xs};
                    }
                  `}
                >
                  {renderGridCell(col.id, value, child, watchlistNames, euiTheme, handlers)}
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
              padding: 6px;
              .euiDataGrid--paddingSmall & {
                padding: ${euiTheme.size.xs};
              }
              .euiDataGrid--paddingLarge & {
                padding: ${euiTheme.size.s};
              }
            `}
          >
            {renderGridCell(col.id, value, child, watchlistNames, euiTheme, handlers)}
          </div>
        );
      })}
    </div>
  </div>
);

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
