/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { TIME_RANGE_OPTIONS, type TimeRange } from './time_range';
export {
  EMPTY_ENTITY_FILTERS,
  ENTITY_FILTER_ES_FIELDS,
  ENTITY_FILTER_FIELDS,
  getEntityFilterESQL,
  type EntityFilters,
} from './entity_filters';
export { buildSampleTail, type TileCountQueryOptions } from './query_options';
export { pinQueryNow } from './pin_now';
export { getDeltaPercentage } from './delta_percentage';
export { buildNewEntityCountQuery, buildNewEntityPrevCountQuery } from './new_entity_count_query';
export {
  parseAlertBasedTilesResponse,
  parseAlertBasedTilesTrend,
  type AlertBasedTilesResult,
  type AlertBasedTilesTrend,
} from './parse_alert_based_tiles';
export {
  alertsIndex,
  alertsPrevWindow,
  alertsWindow,
  buildAlertBasedTilesQuery,
} from './entities_with_alerts_query';
export {
  buildRiskMoversCountQuery,
  riskMoversPrevWindow,
  riskMoversWindow,
} from './tile_risk_movers_query';
export {
  buildNewlyHighCriticalCountQuery,
  newlyHighCriticalPrevWindow,
  newlyHighCriticalWindow,
} from './tile_newly_high_critical_query';
export { TRAILING_WINDOW } from './tile_trailing_window';
export { buildAlertBasedTilesTrailingSeriesQuery } from './entities_with_alerts_trailing_series_query';
export { buildRiskMoversTrailingSeriesQuery } from './tile_risk_movers_trailing_series_query';
export { buildNewlyHighCriticalTrailingSeriesQuery } from './tile_newly_high_critical_trailing_series_query';
