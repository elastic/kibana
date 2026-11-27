/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreSetup } from '@kbn/core/server';
import { NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG } from '@kbn/nightshift-shared';
import { createIsOnlineEvalsPaused } from './is_online_evals_paused';

describe('createIsOnlineEvalsPaused', () => {
  const setup = () => {
    const flag$ = new BehaviorSubject(false);
    const getBooleanValue$ = jest.fn().mockReturnValue(flag$);
    let resolveStart: (value: unknown) => void = () => {};
    const startServices = new Promise((resolve) => {
      resolveStart = resolve;
    });
    const isPaused = createIsOnlineEvalsPaused(
      (() => startServices) as unknown as CoreSetup['getStartServices']
    );
    const start = async () => {
      resolveStart([{ featureFlags: { getBooleanValue$ } }]);
      await startServices;
    };

    return { isPaused, start, flag$, getBooleanValue$ };
  };

  it('reads paused until the flag can be read, so scoring fails closed', () => {
    const { isPaused } = setup();

    expect(isPaused()).toBe(true);
  });

  it('follows the flag, with a false fallback, once start services resolve', async () => {
    const { isPaused, start, flag$, getBooleanValue$ } = setup();

    await start();

    expect(getBooleanValue$).toHaveBeenCalledWith(NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG, false);
    expect(isPaused()).toBe(false);
    flag$.next(true);
    expect(isPaused()).toBe(true);
    flag$.next(false);
    expect(isPaused()).toBe(false);
  });
});
