/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { followBooleanFlag } from './follow_boolean_flag';

const follow = (flag$: Subject<boolean>) => {
  const featureFlags = { getBooleanValue$: jest.fn(() => flag$) };
  const followed = followBooleanFlag({ fallbackValue: true, featureFlags, flagName: 'some.flag' });
  return { featureFlags, followed };
};

describe('followBooleanFlag', () => {
  it('asks for the flag with its fallback value', () => {
    const { featureFlags } = follow(new BehaviorSubject(false));

    expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith('some.flag', true);
  });

  it('reads the fallback value until the flag first emits', () => {
    expect(follow(new Subject<boolean>()).followed.getValue()).toBe(true);
  });

  it('reads the latest value, not the first', () => {
    const flag$ = new BehaviorSubject(false);
    const { followed } = follow(flag$);

    flag$.next(true);

    expect(followed.getValue()).toBe(true);
  });

  it('stops following once stopped', () => {
    const flag$ = new BehaviorSubject(false);
    const { followed } = follow(flag$);

    followed.stop();
    flag$.next(true);

    expect(flag$.observed).toBe(false);
    expect(followed.getValue()).toBe(false);
  });
});
