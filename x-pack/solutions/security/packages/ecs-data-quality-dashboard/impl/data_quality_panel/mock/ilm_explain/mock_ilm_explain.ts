/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';

export const mockIlmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> = {
  '.ds-packetbeat-8.6.1-2023.02.04-000001': {
    index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
    managed: true,
    policy: 'packetbeat',
    index_creation_date_millis: 1675536751379,
    time_since_index_creation: '3.98d',
    lifecycle_date_millis: 1675536751379,
    age: '3.98d',
    phase: 'hot',
    phase_time_millis: 1675536751809,
    action: 'rollover',
    action_time_millis: 1675536751809,
    step: 'check-rollover-ready',
    step_time_millis: 1675536751809,
    phase_execution: {
      policy: 'packetbeat',
      version: 1,
      modified_date_in_millis: 1675536751205,
    },
  },
  '.ds-packetbeat-8.5.3-2023.02.04-000001': {
    index: '.ds-packetbeat-8.5.3-2023.02.04-000001',
    managed: true,
    policy: 'packetbeat',
    index_creation_date_millis: 1675536774084,
    time_since_index_creation: '3.98d',
    lifecycle_date_millis: 1675536774084,
    age: '3.98d',
    phase: 'hot',
    phase_time_millis: 1675536774416,
    action: 'rollover',
    action_time_millis: 1675536774416,
    step: 'check-rollover-ready',
    step_time_millis: 1675536774416,
    phase_execution: {
      policy: 'packetbeat',
      version: 1,
      modified_date_in_millis: 1675536751205,
    },
  },
  'auditbeat-custom-index-1': {
    index: 'auditbeat-custom-index-1',
    managed: false,
  },
};
