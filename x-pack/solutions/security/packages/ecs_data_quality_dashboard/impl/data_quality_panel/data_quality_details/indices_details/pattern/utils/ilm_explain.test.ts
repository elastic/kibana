/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IlmExplainLifecycleLifecycleExplain,
  IlmExplainLifecycleLifecycleExplainManaged,
  IlmExplainLifecycleLifecycleExplainUnmanaged,
} from '@elastic/elasticsearch/lib/api/types';
import { mockIlmExplain } from '../../../../mock/ilm_explain/mock_ilm_explain';
import { getIlmExplainPhaseCounts, getPhaseCount, isManaged } from './ilm_explain';

const indexName = '.ds-packetbeat-8.6.1-2023.02.04-000001';

const hot: IlmExplainLifecycleLifecycleExplainManaged = {
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
};
const warm = {
  ...hot,
  phase: 'warm',
};
const cold = {
  ...hot,
  phase: 'cold',
};
const frozen = {
  ...hot,
  phase: 'frozen',
};

const managed: Record<string, IlmExplainLifecycleLifecycleExplainManaged> = {
  hot,
  warm,
  cold,
  frozen,
};

const unmanaged: IlmExplainLifecycleLifecycleExplainUnmanaged = {
  index: 'michael',
  managed: false,
};

describe('isManaged', () => {
  test('it returns true when the `ilmExplainRecord` `managed` property is true', () => {
    const ilmExplain = mockIlmExplain[indexName];

    expect(isManaged(ilmExplain)).toBe(true);
  });

  test('it returns false when the `ilmExplainRecord` is undefined', () => {
    expect(isManaged(undefined)).toBe(false);
  });
});

describe('getPhaseCount', () => {
  test('it returns the expected count when an index with the specified `ilmPhase` exists in the `IlmExplainLifecycleLifecycleExplain` record', () => {
    expect(
      getPhaseCount({
        ilmExplain: mockIlmExplain,
        ilmPhase: 'hot', // this phase is in the record
        indexName, // valid index name
      })
    ).toEqual(1);
  });

  test('it returns zero when `ilmPhase` is null', () => {
    expect(
      getPhaseCount({
        ilmExplain: null,
        ilmPhase: 'hot',
        indexName,
      })
    ).toEqual(0);
  });

  test('it returns zero when the `indexName` does NOT exist in the `IlmExplainLifecycleLifecycleExplain` record', () => {
    expect(
      getPhaseCount({
        ilmExplain: mockIlmExplain,
        ilmPhase: 'hot',
        indexName: 'invalid', // this index does NOT exist
      })
    ).toEqual(0);
  });

  test('it returns zero when the specified `ilmPhase` does NOT exist in the `IlmExplainLifecycleLifecycleExplain` record', () => {
    expect(
      getPhaseCount({
        ilmExplain: mockIlmExplain,
        ilmPhase: 'warm', // this phase is NOT in the record
        indexName, // valid index name
      })
    ).toEqual(0);
  });

  describe('when `ilmPhase` is `unmanaged`', () => {
    test('it returns the expected count for an `unmanaged` index', () => {
      const index = 'auditbeat-custom-index-1';
      const ilmExplainRecord: IlmExplainLifecycleLifecycleExplain = {
        index,
        managed: false,
      };
      const ilmExplain = {
        [index]: ilmExplainRecord,
      };

      expect(
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'unmanaged', // ilmPhase is unmanaged
          indexName: index, // an unmanaged index
        })
      ).toEqual(1);
    });

    test('it returns zero for a managed index', () => {
      expect(
        getPhaseCount({
          ilmExplain: mockIlmExplain,
          ilmPhase: 'unmanaged', // ilmPhase is unmanaged
          indexName, // a managed (`hot`) index
        })
      ).toEqual(0);
    });
  });
});

describe('getIlmExplainPhaseCounts', () => {
  test('it returns the expected counts (all zeros) when `ilmExplain` is null', () => {
    expect(getIlmExplainPhaseCounts(null)).toEqual({
      cold: 0,
      frozen: 0,
      hot: 0,
      unmanaged: 0,
      warm: 0,
    });
  });

  test('it returns the expected counts', () => {
    const ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> = {
      ...managed,
      [unmanaged.index]: unmanaged,
    };

    expect(getIlmExplainPhaseCounts(ilmExplain)).toEqual({
      cold: 1,
      frozen: 1,
      hot: 1,
      unmanaged: 1,
      warm: 1,
    });
  });
});
