/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFindAttackDiscoveryAlertsAggregation } from '.';

describe('getFindAttackDiscoveryAlertsAggregation', () => {
  it('returns the expected alert_ids terms aggregation', () => {
    const result = getFindAttackDiscoveryAlertsAggregation();
    expect(result.alert_ids).toEqual({
      terms: {
        field: 'kibana.alert.attack_discovery.alert_ids',
        size: 1000,
      },
    });
  });

  it('returns the expected api_config_name terms aggregation', () => {
    const result = getFindAttackDiscoveryAlertsAggregation();
    expect(result.api_config_name).toEqual({
      terms: {
        field: 'kibana.alert.attack_discovery.api_config.name',
        size: 100,
      },
    });
  });

  it('returns the expected unique_alert_ids_count sum_bucket aggregation the with correct buckets_path', () => {
    const result = getFindAttackDiscoveryAlertsAggregation();
    expect(result.unique_alert_ids_count).toEqual({
      sum_bucket: {
        buckets_path: 'alert_ids>_count',
      },
    });
  });
});
