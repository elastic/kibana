/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { assertNever } from '@kbn/std';
import type { EuiThemeComputed, RenderCellValue } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import { ENTITY_TYPE_FIELD, getString } from '../common';
import type { Row, RowsMode } from '../common';
import { ENRICHED_FIELDS, isGridColumnId, type GridColumnId } from '../grid_columns';
import { AlertCountCell } from './cells/alert_count_cell';
import { AnomalyCountCell } from './cells/anomaly_count_cell';
import { CriticalityCell } from './cells/criticality_cell';
import { DefaultCell } from './cells/default_cell';
import { EntityNameCell } from './cells/entity_name_cell';
import { EntityTypeCell } from './cells/entity_type_cell';
import { GroupSizeCell } from './cells/group_size_cell';
import { RiskScoreChangeCell } from './cells/risk_score_change_cell';
import { RiskScoreValueCell } from './cells/risk_score_value_cell';
import { SourceCell } from './cells/source_cell';
import { WatchlistsCell } from './cells/watchlists_cell';
import { loadingPlaceholderCss } from './entities_grid_styles';

/** The rows mode tells a resolved row, which stands for its whole group, from a single record. */
export interface CellHandlers {
  onEntityNameClick?: (row: Row, rowsMode: RowsMode) => void;
  onGroupSizeClick?: (row: Row, rowsMode: RowsMode) => void;
  onAlertCountClick?: (row: Row, rowsMode: RowsMode) => void;
  onAnomalyCountClick?: (row: Row, rowsMode: RowsMode) => void;
}

/** The handlers of the cells of rows in one rows mode. */
export interface RowCellHandlers {
  onEntityNameClick?: (row: Row) => void;
  onGroupSizeClick?: (row: Row) => void;
  onAlertCountClick?: (row: Row) => void;
  onAnomalyCountClick?: (row: Row) => void;
}

export const bindRowsMode = (
  { onEntityNameClick, onGroupSizeClick, onAlertCountClick, onAnomalyCountClick }: CellHandlers,
  rowsMode: RowsMode
): RowCellHandlers => ({
  onEntityNameClick: onEntityNameClick && ((row) => onEntityNameClick(row, rowsMode)),
  onGroupSizeClick: onGroupSizeClick && ((row) => onGroupSizeClick(row, rowsMode)),
  onAlertCountClick: onAlertCountClick && ((row) => onAlertCountClick(row, rowsMode)),
  onAnomalyCountClick: onAnomalyCountClick && ((row) => onAnomalyCountClick(row, rowsMode)),
});

/** Must stay stable: EUI builds its cell component from it, so a new one remounts every cell. */
export interface EntityGridCellContext {
  watchlistNames: Map<string, string>;
  euiTheme: EuiThemeComputed;
  cellHandlers?: RowCellHandlers;
}

/** Apart from `cellContext`, so new rows re-render cells instead of remounting them. */
export interface EntityGridRows {
  rows: Row[];
  isEnriching: boolean;
}

export const EntityGridRowsContext = createContext<EntityGridRows>({
  rows: [],
  isEnriching: false,
});

/** Shaped like "—", so a cell holds still when its value arrives. */
const cellLoadingPlaceholderCss = css`
  inline-size: 1em;
  block-size: 2px;
  border-radius: 1px;
`;

// The alerts flyout has no service case yet, and the anomalies flyout takes only hosts and users.
const ALERTS_FLYOUT_TYPES: ReadonlySet<string> = new Set(['host', 'user', 'generic']);
const ANOMALIES_FLYOUT_TYPES: ReadonlySet<string> = new Set(['host', 'user']);

const opensFor = <T,>(handler: T | undefined, types: ReadonlySet<string>, row: Row) =>
  types.has(getString(row, ENTITY_TYPE_FIELD) ?? '') ? handler : undefined;

/** Hours before a date shows as absolute: never, so the columns read as how long ago. */
const ALWAYS_RELATIVE_HOURS = 24 * 365 * 100;

// The cells are memoized on primitive props: EUI re-renders every cell when the page rows
// change (shell, then enrich), but most cell values stay the same.
const renderKnownEntityCell = (
  columnId: GridColumnId,
  value: unknown,
  row: Row,
  watchlistNames: Map<string, string>,
  euiTheme: EuiThemeComputed,
  handlers?: RowCellHandlers
): JSX.Element => {
  const { onEntityNameClick, onGroupSizeClick, onAlertCountClick, onAnomalyCountClick } =
    handlers ?? {};

  switch (columnId) {
    case 'entity.name':
      return <EntityNameCell value={value} row={row} onEntityNameClick={onEntityNameClick} />;
    case 'group_size':
      return <GroupSizeCell value={value} row={row} onGroupSizeClick={onGroupSizeClick} />;
    case 'last_seen_alert':
    case '@timestamp':
    case 'entity.lifecycle.first_seen':
      // How long ago, with the absolute date in the user's format in the tooltip.
      return (
        <FormattedRelativePreferenceDate
          value={typeof value === 'string' || typeof value === 'number' ? value : null}
          relativeThresholdInHrs={ALWAYS_RELATIVE_HOURS}
        />
      );
    case 'entity.EngineMetadata.Type':
      return <EntityTypeCell value={value} />;
    case 'entity.risk.calculated_score_norm':
      return <RiskScoreValueCell value={value} />;
    case 'risk_score_change':
      return <RiskScoreChangeCell value={value} />;
    case 'alert_count':
      return (
        <AlertCountCell
          value={value}
          row={row}
          euiTheme={euiTheme}
          onAlertCountClick={opensFor(onAlertCountClick, ALERTS_FLYOUT_TYPES, row)}
        />
      );
    case 'anomaly_count':
      return (
        <AnomalyCountCell
          value={value}
          row={row}
          onAnomalyCountClick={opensFor(onAnomalyCountClick, ANOMALIES_FLYOUT_TYPES, row)}
        />
      );
    case 'case_count':
      return value == null || value === 0 ? <>{'—'}</> : <>{String(value)}</>;
    case 'entity.attributes.watchlists':
      return <WatchlistsCell value={value} watchlistNames={watchlistNames} />;
    case 'asset.criticality':
      return <CriticalityCell value={value} />;
    case 'entity.source':
      return <SourceCell value={value} />;
    case 'entity.relationships.resolution.resolved_to':
      return <DefaultCell value={value} />;
  }

  return assertNever(columnId);
};

/** The content of a grid cell: the row's value for the column, rendered for its type. */
export const renderEntityCell = (
  columnId: string,
  row: Row,
  watchlistNames: Map<string, string>,
  euiTheme: EuiThemeComputed,
  handlers?: RowCellHandlers,
  isEnriching = false
): JSX.Element => {
  const value = row[columnId];
  // Enrichers set every field they own (null or 0 when empty), so `undefined` here
  // means "not loaded yet", not "no value". Show a placeholder rather than "—".
  if (isEnriching && value === undefined && ENRICHED_FIELDS.has(columnId)) {
    return (
      <span
        css={[loadingPlaceholderCss, cellLoadingPlaceholderCss]}
        style={{ background: euiTheme.colors.lightShade }}
      />
    );
  }
  if (!isGridColumnId(columnId)) {
    return <DefaultCell value={value} />;
  }
  return renderKnownEntityCell(columnId, value, row, watchlistNames, euiTheme, handlers);
};

export const RenderEntityGridCell: RenderCellValue = (cellProps) => {
  const { rowIndex, columnId } = cellProps;
  const { watchlistNames, euiTheme, cellHandlers } = cellProps as typeof cellProps &
    EntityGridCellContext;
  const { rows, isEnriching } = useContext(EntityGridRowsContext);
  const row = rows[rowIndex];
  if (!row) return null;
  return renderEntityCell(columnId, row, watchlistNames, euiTheme, cellHandlers, isEnriching);
};
