/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface WatchlistMetrics {
  watchlists: {
    total: number;
    managed: number;
    custom: number;
    spaces: number;
  };
  custom_risk_modifier: {
    min: number;
    max: number;
    avg: number;
  };
  entity_sources: {
    total: number;
    enabled: number;
    with_query_rule: number;
    with_filter: number;
    by_type: {
      index: number;
      entity_analytics_integration: number;
      store: number;
    };
  };
}
