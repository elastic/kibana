/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreSetup } from '@kbn/core/server';
import { NIGHTSHIFT_ONLINE_EVALS_INCLUDE_EXPLANATIONS_FLAG } from '@kbn/nightshift-shared';
import { createShouldIncludeExplanations } from './should_include_explanations';

describe('createShouldIncludeExplanations', () => {
  const setup = () => {
    const flag$ = new BehaviorSubject(false);
    const getBooleanValue$ = jest.fn().mockReturnValue(flag$);
    let resolveStart: (value: unknown) => void = () => {};
    const startServices = new Promise((resolve) => {
      resolveStart = resolve;
    });
    const shouldIncludeExplanations = createShouldIncludeExplanations(
      (() => startServices) as unknown as CoreSetup['getStartServices']
    );
    const start = async () => {
      resolveStart([{ featureFlags: { getBooleanValue$ } }]);
      await startServices;
    };

    return { shouldIncludeExplanations, start, flag$, getBooleanValue$ };
  };

  it('leaves explanations out until the flag can be read', () => {
    const { shouldIncludeExplanations } = setup();

    expect(shouldIncludeExplanations()).toBe(false);
  });

  it('follows the flag, with a false fallback, once start services resolve', async () => {
    const { shouldIncludeExplanations, start, flag$, getBooleanValue$ } = setup();

    await start();

    expect(getBooleanValue$).toHaveBeenCalledWith(
      NIGHTSHIFT_ONLINE_EVALS_INCLUDE_EXPLANATIONS_FLAG,
      false
    );
    expect(shouldIncludeExplanations()).toBe(false);
    flag$.next(true);
    expect(shouldIncludeExplanations()).toBe(true);
    flag$.next(false);
    expect(shouldIncludeExplanations()).toBe(false);
  });
});
