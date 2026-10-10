/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { assertNever } from '@kbn/std';
import type { EuiThemeComputed } from '@elastic/eui';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import type { Row } from '../common';
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

export interface CellHandlers {
  onEntityNameClick?: (row: Row) => void;
  onGroupSizeClick?: (row: Row) => void;
  onAlertCountClick?: (row: Row) => void;
  onAnomalyCountClick?: (row: Row) => void;
}

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
  handlers?: CellHandlers
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
          onAlertCountClick={onAlertCountClick}
        />
      );
    case 'anomaly_count':
      return <AnomalyCountCell value={value} row={row} onAnomalyCountClick={onAnomalyCountClick} />;
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
  handlers?: CellHandlers,
  isEnriching = false
): JSX.Element => {
  const value = row[columnId];
  // Enrichers set every field they own (null or 0 when empty), so `undefined` here
  // means "not loaded yet", not "no value". Show nothing rather than "—".
  if (isEnriching && value === undefined && ENRICHED_FIELDS.has(columnId)) {
    return <></>;
  }
  if (!isGridColumnId(columnId)) {
    return <DefaultCell value={value} />;
  }
  return renderKnownEntityCell(columnId, value, row, watchlistNames, euiTheme, handlers);
};
