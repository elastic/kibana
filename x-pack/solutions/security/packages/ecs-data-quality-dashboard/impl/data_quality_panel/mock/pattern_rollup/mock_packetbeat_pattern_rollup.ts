/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatternRollup } from '../../types';

/**
 * This `PatternRollup` containing the following indices:
 * ```
 * .ds-packetbeat-8.5.3-2023.02.04-000001
 * .ds-packetbeat-8.6.1-2023.02.04-000001
 *
 * ```
 * has no `results`, because the indices were NOT checked
 */
export const packetbeatNoResults: PatternRollup = {
  docsCount: 3258632,
  error: null,
  ilmExplain: {
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
      managed: true,
      policy: 'packetbeat',
      phase: 'hot',
    },
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      index: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      managed: true,
      policy: 'packetbeat',
      phase: 'hot',
    },
  },
  ilmExplainPhaseCounts: {
    hot: 2,
    warm: 0,
    cold: 0,
    frozen: 0,
    unmanaged: 0,
  },
  indices: 2,
  pattern: 'packetbeat-*',
  results: undefined,
  sizeInBytes: 1096520898,
  stats: {
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      uuid: 'x5Uuw4j4QM2YidHLNixCwg',
      name: '.ds-packetbeat-8.6.1-2023.02.04-000001',
      num_docs: 1628343,
      size_in_bytes: 512194751,
    },
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      uuid: 'we0vNWm2Q6iz6uHubyHS6Q',
      size_in_bytes: 584326147,
      name: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      num_docs: 1630289,
    },
  },
};

/**
 * This `PatternRollup` containing the following indices:
 * ```
 * .ds-packetbeat-8.5.3-2023.02.04-000001
 * .ds-packetbeat-8.6.1-2023.02.04-000001
 *
 * ```
 * has partial `results`, because:
 * 1) Errors occurred while checking the `.ds-packetbeat-8.5.3-2023.02.04-000001` index
 * 2) The `.ds-packetbeat-8.6.1-2023.02.04-000001` passed the check
 */
export const packetbeatWithSomeErrors: PatternRollup = {
  docsCount: 3258632,
  error: null,
  ilmExplain: {
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
      managed: true,
      policy: 'packetbeat',
      phase: 'hot',
    },
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      index: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      managed: true,
      policy: 'packetbeat',
      phase: 'hot',
    },
  },
  ilmExplainPhaseCounts: {
    hot: 2,
    warm: 0,
    cold: 0,
    frozen: 0,
    unmanaged: 0,
  },
  indices: 2,
  pattern: 'packetbeat-*',
  results: {
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      docsCount: 1630289,
      error:
        'Error loading mappings for .ds-packetbeat-8.5.3-2023.02.04-000001: Error: simulated error fetching index .ds-packetbeat-8.5.3-2023.02.04-000001',
      ilmPhase: 'hot',
      incompatible: undefined,
      indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      markdownComments: ['foo', 'bar', 'baz'],
      pattern: 'packetbeat-*',
      sameFamily: undefined,
      checkedAt: 1706526408000,
    },
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      docsCount: 1628343,
      error: null,
      ilmPhase: 'hot',
      incompatible: 0,
      indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
      markdownComments: ['foo', 'bar', 'baz'],
      pattern: 'packetbeat-*',
      sameFamily: 0,
      checkedAt: 1706526408000,
    },
  },
  sizeInBytes: 1096520898,
  stats: {
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      uuid: 'x5Uuw4j4QM2YidHLNixCwg',
      size_in_bytes: 731583142,
      name: '.ds-packetbeat-8.6.1-2023.02.04-000001',
      num_docs: 1628343,
    },
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      uuid: 'we0vNWm2Q6iz6uHubyHS6Q',
      size_in_bytes: 584326147,
      name: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      num_docs: 1630289,
    },
  },
};

export const mockPacketbeatPatternRollup: PatternRollup = {
  docsCount: 3258632,
  error: null,
  ilmExplain: {
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
      managed: true,
      policy: 'packetbeat',
      index_creation_date_millis: 1675536751379,
      time_since_index_creation: '25.26d',
      lifecycle_date_millis: 1675536751379,
      age: '25.26d',
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
      time_since_index_creation: '25.26d',
      lifecycle_date_millis: 1675536774084,
      age: '25.26d',
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
  },
  ilmExplainPhaseCounts: {
    hot: 2,
    warm: 0,
    cold: 0,
    frozen: 0,
    unmanaged: 0,
  },
  indices: 2,
  pattern: 'packetbeat-*',
  results: undefined,
  sizeInBytes: 1464758182,
  stats: {
    '.ds-packetbeat-8.6.1-2023.02.04-000001': {
      uuid: 'x5Uuw4j4QM2YidHLNixCwg',
      size_in_bytes: 731583142,
      name: '.ds-packetbeat-8.6.1-2023.02.04-000001',
      num_docs: 1628343,
    },
    '.ds-packetbeat-8.5.3-2023.02.04-000001': {
      uuid: 'we0vNWm2Q6iz6uHubyHS6Q',
      size_in_bytes: 733175040,
      name: '.ds-packetbeat-8.5.3-2023.02.04-000001',
      num_docs: 1630289,
    },
  },
};
