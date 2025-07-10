/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME } from '../../schedules/fields';

/**
 * Counts the unique alert IDs in attack discovery alerts
 */
export const getFindAttackDiscoveryAlertsAggregation = (): Record<
  string,
  estypes.AggregationsAggregationContainer
> => ({
  api_config_name: {
    terms: {
      field: ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME, // kibana.alert.attack_discovery.api_config.name
      size: 100, // up to 100 unique connector names
    },
  },
  unique_alert_ids_count: {
    cardinality: {
      field: 'kibana.alert.attack_discovery.alert_ids',
    },
  },
});
