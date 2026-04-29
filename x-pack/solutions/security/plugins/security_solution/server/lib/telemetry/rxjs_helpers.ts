/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rx from 'rxjs';

/**
 * This utility class stores the values sent to a reactive flow while its state
 * is `started`. Once it's stopped (after calling `flush()`) it will send all
 * the cached values to the configured `subject$`.
 */
export class CachedSubject<T> {
  public readonly flushCache$ = new rx.Subject<void>();
  public readonly stopCaching$ = new rx.Subject<void>();

  constructor(subject$: rx.Subject<T>) {
    this.setup(subject$);
  }

  public stop(): void {
    this.stopCaching$.next();
  }

  public flush(): void {
    this.flushCache$.next();
  }

  private setup(subject$: rx.Subject<T>): void {
    // Cache the incoming events that are sent during the timeframe between
    // `service.setup()` and `service.start()`, otherwise, they would be lost
    const cache$ = new rx.ReplaySubject<T>();
    const storingCache$ = new rx.BehaviorSubject<boolean>(true);

    // 1. sends incoming values to the cache$, works only while
    // `storingCache$` is set to true
    storingCache$
      .pipe(
        rx.distinctUntilChanged(),
        rx.switchMap((isCaching) => (isCaching ? subject$ : rx.EMPTY)),
        rx.takeUntil(rx.merge(this.stopCaching$))
      )
      .subscribe((data) => {
        cache$.next(data);
      });

    // 2. when flushCache is triggered, stop caching values and send the cached
    // ones to the real flow (i.e. `subject$`).
    this.flushCache$.pipe(rx.exhaustMap(() => cache$)).subscribe((data) => {
      storingCache$.next(false);
      subject$.next(data);
    });
  }
}

/**
 * Executes the given `body()` function wrappig it in a retry logic by using
 * the rxjs `retry` operator.
 *
 * @param retryCount the number of times to retry the `body()` function
 * @param retryDelayMillis the delay between each retry
 * @param body the function to execute
 * @returns an observable that emits either the result returned by the `body()`
 * function or the latest caught error after exhausting the retryCount.
 */
export function retryOnError$<R>(
  retryCount: number,
  retryDelayMillis: number,
  body: () => R
): rx.Observable<R> {
  return rx
    .defer(async () => body())
    .pipe(
      rx.retry({
        count: retryCount,
        delay: retryDelayMillis,
      }),
      rx.catchError((error) => {
        return rx.of(error);
      })
    );
}
