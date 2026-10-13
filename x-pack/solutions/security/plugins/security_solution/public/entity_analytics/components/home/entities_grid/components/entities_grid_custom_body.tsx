/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  useEuiTheme,
  type EuiDataGridCustomBodyProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getEntityId } from '../common';
import { useResetEntityGridFilters } from '../hooks/use_reset_entity_grid_filters';
import { ExpandedEntityGroup } from './entities_expanded_row';
import { EntityGridLoadMore } from './entities_grid_load_more';
import { gridRowCellsCss, gridRowCss } from './entities_grid_styles';
import { useEntityGridView } from './entities_grid_view_context';

const EMPTY_GRID_MESSAGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.emptyMessage',
  { defaultMessage: 'No records match the current filters' }
);

const RESET_FILTERS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.resetFiltersButton',
  { defaultMessage: 'Reset' }
);

export const EntityGridCustomBody = memo(
  ({
    Cell,
    visibleColumns: visCols,
    visibleRowData,
    headerRow,
    footerRow,
  }: EuiDataGridCustomBodyProps) => {
    const { euiTheme } = useEuiTheme();
    const {
      rows,
      expandedIds,
      timeRange,
      keepFields,
      columns,
      watchlistNames,
      cellHandlers,
      isFetching,
      cellPadding,
    } = useEntityGridView();
    const onResetFilters = useResetEntityGridFilters();
    // One style object for all rows, instead of serializing it again for each row.
    const rowBorderCss = useMemo(
      () => css`
        border-block-end: ${euiTheme.border.thin};
      `,
      [euiTheme.border.thin]
    );

    return (
      <>
        {headerRow}
        {rows.length === 0 && !isFetching ? (
          <EuiEmptyPrompt
            color="transparent"
            body={<p>{EMPTY_GRID_MESSAGE}</p>}
            paddingSize="l"
            actions={
              <EuiButton size="s" color="primary" fill onClick={onResetFilters}>
                {RESET_FILTERS_LABEL}
              </EuiButton>
            }
          />
        ) : (
          rows.map((row, i) => {
            const absoluteIndex = visibleRowData.startRow + i;
            const entityId = getEntityId(row);
            return (
              <React.Fragment key={entityId ?? i}>
                <div role="row" className="euiDataGridRow" css={[gridRowCss, rowBorderCss]}>
                  <div css={gridRowCellsCss}>
                    {visCols.map((col, ci) => (
                      <Cell
                        colIndex={ci}
                        visibleRowIndex={absoluteIndex}
                        key={`${entityId}-${col.id}`}
                      />
                    ))}
                  </div>
                </div>
                {entityId && expandedIds.has(entityId) && (
                  <ExpandedEntityGroup
                    entityId={entityId}
                    timeRange={timeRange}
                    keepFields={keepFields}
                    cellPadding={cellPadding}
                    visCols={visCols}
                    columns={columns}
                    euiTheme={euiTheme}
                    watchlistNames={watchlistNames}
                    handlers={cellHandlers}
                  />
                )}
              </React.Fragment>
            );
          })
        )}
        <EntityGridLoadMore />
        {footerRow}
      </>
    );
  }
);
EntityGridCustomBody.displayName = 'EntityGridCustomBody';
