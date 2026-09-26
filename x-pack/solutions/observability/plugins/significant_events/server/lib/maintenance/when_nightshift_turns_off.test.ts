/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { NIGHTSHIFT_FLAG_SETTLE_MS, whenNightshiftTurnsOff } from './when_nightshift_turns_off';

describe('whenNightshiftTurnsOff', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('emits only for settled runtime on→off flips, never for boot-time or transient readings', () => {
    const enabled$ = new Subject<boolean>();
    const onTurnedOff = jest.fn();
    whenNightshiftTurnsOff(enabled$).subscribe(onTurnedOff);
    const emit = (value: boolean, holdMs: number) => {
      enabled$.next(value);
      jest.advanceTimersByTime(holdMs);
    };

    // Boot: fallback `false`, a transient `true` against an incomplete context, then the
    // authoritative `false`, all before the value settles.
    emit(false, 100);
    emit(true, 100);
    emit(false, NIGHTSHIFT_FLAG_SETTLE_MS);
    expect(onTurnedOff).not.toHaveBeenCalled();

    // Turned on and held, then a brief off that flips back on before settling.
    emit(true, NIGHTSHIFT_FLAG_SETTLE_MS);
    emit(false, 100);
    emit(true, NIGHTSHIFT_FLAG_SETTLE_MS);
    expect(onTurnedOff).not.toHaveBeenCalled();

    // A real runtime flip off, held long enough to count.
    emit(false, NIGHTSHIFT_FLAG_SETTLE_MS);
    expect(onTurnedOff).toHaveBeenCalledTimes(1);

    emit(true, NIGHTSHIFT_FLAG_SETTLE_MS);
    emit(false, NIGHTSHIFT_FLAG_SETTLE_MS);
    expect(onTurnedOff).toHaveBeenCalledTimes(2);
  });
});
