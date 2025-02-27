/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IlmExplainLifecycleLifecycleExplainManaged,
  IlmExplainLifecycleLifecycleExplainUnmanaged,
} from '@elastic/elasticsearch/lib/api/types';

import { getIlmPhase } from './get_ilm_phase';

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
const other = {
  ...hot,
  phase: 'other', // not a valid phase
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

describe('getIlmPhase', () => {
  const isILMAvailable = true;
  test('it returns undefined when the `ilmExplainRecord` is undefined', () => {
    expect(getIlmPhase(undefined, isILMAvailable)).toBeUndefined();
  });

  describe('when the `ilmExplainRecord` is a `IlmExplainLifecycleLifecycleExplainManaged` record', () => {
    Object.keys(managed).forEach((phase) =>
      test(`it returns the expected phase when 'phase' is '${phase}'`, () => {
        expect(getIlmPhase(managed[phase], isILMAvailable)).toEqual(phase);
      })
    );

    test(`it returns undefined when the 'phase' is unknown`, () => {
      expect(getIlmPhase(other, isILMAvailable)).toBeUndefined();
    });
  });

  describe('when the `ilmExplainRecord` is a `IlmExplainLifecycleLifecycleExplainUnmanaged` record', () => {
    test('it returns `unmanaged`', () => {
      expect(getIlmPhase(unmanaged, isILMAvailable)).toEqual('unmanaged');
    });
  });
});
