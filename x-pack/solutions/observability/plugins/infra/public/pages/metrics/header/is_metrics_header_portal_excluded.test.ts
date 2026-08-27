/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMetricsHeaderPortalExcluded } from './is_metrics_header_portal_excluded';
import { METRICS_INVENTORY_PATH, METRICS_DETAIL_PATH } from './metrics_header_paths';

describe('isMetricsHeaderPortalExcluded', () => {
  it('excludes no Metrics paths until a route PR appends one', () => {
    expect(isMetricsHeaderPortalExcluded('/inventory')).toBe(false);
    expect(isMetricsHeaderPortalExcluded('/hosts')).toBe(false);
    expect(isMetricsHeaderPortalExcluded('/detail/host/web-01')).toBe(false);
  });

  it('matches a parent path and its nested segments', () => {
    expect(isMetricsHeaderPortalExcluded('/inventory', [METRICS_INVENTORY_PATH])).toBe(true);
    expect(isMetricsHeaderPortalExcluded('/inventory/extra', [METRICS_INVENTORY_PATH])).toBe(true);
    expect(isMetricsHeaderPortalExcluded('/hosts', [METRICS_INVENTORY_PATH])).toBe(false);
  });

  it('can exclude every detail page with the detail parent path', () => {
    expect(isMetricsHeaderPortalExcluded('/detail/host/web-01', [METRICS_DETAIL_PATH])).toBe(true);
    expect(isMetricsHeaderPortalExcluded('/detail/pod/p1', [METRICS_DETAIL_PATH])).toBe(true);
    expect(isMetricsHeaderPortalExcluded('/hosts', [METRICS_DETAIL_PATH])).toBe(false);
  });
});
