/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { BehaviorSubject } from 'rxjs';
import { createWorkerFeatureFlagValues } from './feature_flags';
import type { WorkerFeatureFlag } from './types';

const BOOLEAN_FLAG: WorkerFeatureFlag<boolean> = { key: 'alertzero.example', fallback: true };
const STRING_FLAG: WorkerFeatureFlag<string> = { key: 'alertzero.exampleMode', fallback: 'shadow' };

const createFeatureFlags = () => {
  const { featureFlags } = coreMock.createStart();
  const boolean$ = new BehaviorSubject(false);
  const string$ = new BehaviorSubject('on');
  jest.mocked(featureFlags.getBooleanValue$).mockReturnValue(boolean$);
  jest.mocked(featureFlags.getStringValue$).mockReturnValue(string$);
  return { featureFlags, boolean$, string$ };
};

describe('createWorkerFeatureFlagValues', () => {
  it('reads each fallback until start subscribes', () => {
    const values = createWorkerFeatureFlagValues([BOOLEAN_FLAG, STRING_FLAG]);

    expect(values.get(BOOLEAN_FLAG)).toBe(true);
    expect(values.get(STRING_FLAG)).toBe('shadow');
  });

  it('subscribes to each flag with its own fallback and holds the latest value', () => {
    const values = createWorkerFeatureFlagValues([BOOLEAN_FLAG, STRING_FLAG]);
    const { featureFlags, boolean$ } = createFeatureFlags();

    values.followCoreFeatureFlags(featureFlags);

    expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith('alertzero.example', true);
    expect(featureFlags.getStringValue$).toHaveBeenCalledWith('alertzero.exampleMode', 'shadow');
    expect(values.get(BOOLEAN_FLAG)).toBe(false);
    expect(values.get(STRING_FLAG)).toBe('on');

    boolean$.next(true);

    expect(values.get(BOOLEAN_FLAG)).toBe(true);
  });

  it('stops following the flags once the subscription ends', () => {
    const values = createWorkerFeatureFlagValues([BOOLEAN_FLAG]);
    const { featureFlags, boolean$ } = createFeatureFlags();

    values.followCoreFeatureFlags(featureFlags).unsubscribe();
    boolean$.next(true);

    expect(boolean$.observed).toBe(false);
    expect(values.get(BOOLEAN_FLAG)).toBe(false);
  });

  it('throws for a flag no Worker declares', () => {
    const values = createWorkerFeatureFlagValues([BOOLEAN_FLAG]);

    expect(() => values.get(STRING_FLAG)).toThrow(
      'Feature flag alertzero.exampleMode is not declared by any AlertZero Worker'
    );
  });

  it('rejects two declarations of one flag with different fallbacks', () => {
    expect(() =>
      createWorkerFeatureFlagValues([BOOLEAN_FLAG, { key: BOOLEAN_FLAG.key, fallback: 'on' }])
    ).toThrow('AlertZero Workers declare feature flag alertzero.example with different fallbacks');
  });

  it('follows a flag two Workers declare the same way once', () => {
    const { featureFlags } = createFeatureFlags();
    const values = createWorkerFeatureFlagValues([BOOLEAN_FLAG, { ...BOOLEAN_FLAG }]);

    values.followCoreFeatureFlags(featureFlags);

    expect(featureFlags.getBooleanValue$).toHaveBeenCalledTimes(1);
  });
});
