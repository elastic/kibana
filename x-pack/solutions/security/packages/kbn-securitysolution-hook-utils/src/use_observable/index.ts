/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useReducer, Reducer } from 'react';
import { Observable, Subscription } from 'rxjs';

import { useIsMounted } from '../use_is_mounted';
import { Task } from '../types';

interface State<T> {
  loading: boolean;
  error?: unknown;
  result?: T;
}

export type Action<T> =
  | { type: 'setResult'; result: T }
  | { type: 'setError'; error: unknown }
  | { type: 'load' };

function reducer<T>(state: State<T>, action: Action<T>) {
  switch (action.type) {
    case 'setResult':
      return { ...state, result: action.result, loading: false };
    case 'setError':
      return { ...state, error: action.error, loading: false };
    case 'load':
      return { loading: true, result: undefined, error: undefined };
  }
}

/**
 *
 * @param fn function returning an observable
 *
 * @returns An {@link Async} containing the underlying task's state along with a start callback
 */
export const useObservable = <Args extends unknown[], Result>(
  fn: (...args: Args) => Observable<Result>
): Task<Args, Result> => {
  const isMounted = useIsMounted();
  const subRef = useRef<Subscription | undefined>();
  const [state, dispatch] = useReducer<Reducer<State<Result>, Action<Result>>>(reducer, {
    loading: false,
    error: undefined,
    result: undefined,
  });

  const start = useCallback(
    (...args: Args) => {
      if (subRef.current) {
        subRef.current.unsubscribe();
      }
      dispatch({ type: 'load' });

      subRef.current = fn(...args).subscribe(
        (r) => {
          if (isMounted()) {
            dispatch({ type: 'setResult', result: r });
          }
        },
        (e) => {
          if (isMounted()) {
            dispatch({ type: 'setError', error: e });
          }
        }
      );
    },
    [fn, isMounted]
  );

  useEffect(
    () => () => {
      if (subRef.current) {
        subRef.current.unsubscribe();
      }
    },
    []
  );

  return {
    result: state.result,
    error: state.error,
    loading: state.loading,
    start,
  };
};
