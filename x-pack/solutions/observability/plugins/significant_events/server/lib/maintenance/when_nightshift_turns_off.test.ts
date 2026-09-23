/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { whenNightshiftTurnsOff } from './when_nightshift_turns_off';

describe('whenNightshiftTurnsOff', () => {
  it('emits only for runtime on→off flips, never for the boot-time fallback', () => {
    const enabled$ = new Subject<boolean>();
    const onTurnedOff = jest.fn();
    whenNightshiftTurnsOff(enabled$).subscribe(onTurnedOff);

    // Boot: fallback `false` until the provider connects, then the real value.
    enabled$.next(false);
    enabled$.next(true);
    // Re-evaluations with the same value are not flips.
    enabled$.next(true);
    expect(onTurnedOff).not.toHaveBeenCalled();

    enabled$.next(false);
    enabled$.next(false);
    expect(onTurnedOff).toHaveBeenCalledTimes(1);

    enabled$.next(true);
    enabled$.next(false);
    expect(onTurnedOff).toHaveBeenCalledTimes(2);
  });
});
