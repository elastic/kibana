/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { DependencyList, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HttpFetchOptions, HttpSetup } from '@kbn/core-http-browser';
import { BehaviorSubject } from 'rxjs';
import { InfraHttpError } from '../types';
import { useKibanaContextForPlugin } from './use_kibana';
import { useSearchSessionContext } from './use_search_session';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}

export interface FetcherOptions {
  preservePreviousData?: boolean;
  showToastOnError?: boolean;
  requestObservable$?: BehaviorSubject<(() => any) | undefined>;
  autoFetch?: boolean;
}

type InferApiCallReturnType<Fn> = Fn extends (callApi: ApiCallClient) => Promise<infer R>
  ? R
  : never;

type ApiCallClient = <TClientResponse>(
  path: string,
  options: HttpFetchOptions
) => Promise<TClientResponse>;

interface FetcherResult<TReturn> {
  data?: TReturn;
  status: FETCH_STATUS;
  error?: InfraHttpError;
}

export const isPending = (fetchStatus: FETCH_STATUS) =>
  fetchStatus === FETCH_STATUS.LOADING || fetchStatus === FETCH_STATUS.NOT_INITIATED;
export const isFailure = (fetchStatus: FETCH_STATUS) => fetchStatus === FETCH_STATUS.FAILURE;
export const isSuccess = (fetchStatus: FETCH_STATUS) => fetchStatus === FETCH_STATUS.SUCCESS;

function getDetailsFromErrorResponse(error: InfraHttpError) {
  return (
    <>
      <h5>
        {i18n.translate('xpack.infra.useHTTPRequest.error.status', {
          defaultMessage: `Error`,
        })}
      </h5>
      {error.response?.statusText} ({error.response?.status})
      <h5>
        {i18n.translate('xpack.infra.useHTTPRequest.error.url', {
          defaultMessage: `URL`,
        })}
      </h5>
      {error.response?.url}
      <h5>
        {i18n.translate('xpack.infra.useHTTPRequest.error.body.message', {
          defaultMessage: `Message`,
        })}
      </h5>
      {error.body?.message || error.message}
    </>
  );
}

function createAutoAbortedClient(signal: AbortSignal, http: HttpSetup) {
  return ((path, options) => {
    return http
      .fetch(path, {
        ...options,
        signal,
      } as any)
      .catch((err) => {
        throw err;
      })
      .then((response) => {
        return response;
      });
  }) as ApiCallClient;
}

export function useFetcher<TReturn, Fn extends (apiClient: ApiCallClient) => Promise<TReturn>>(
  fn: Fn,
  fnDeps: DependencyList = [],
  options: FetcherOptions = {}
): FetcherResult<InferApiCallReturnType<Fn>> & { refetch: () => void } {
  const {
    notifications,
    services: { http },
  } = useKibanaContextForPlugin();
  const {
    autoFetch = true,
    preservePreviousData = true,
    showToastOnError = true,
    requestObservable$,
  } = options;

  const [result, setResult] = useState<FetcherResult<InferApiCallReturnType<Fn>>>({
    data: undefined,
    status: FETCH_STATUS.NOT_INITIATED,
  });
  const { searchSessionId } = useSearchSessionContext();
  const [cachedSearchSessionId, setCachedSearchSessionId] = useState('');
  const autoFetchRef = useRef(autoFetch);

  const controller = useRef(new AbortController());

  const fetchWithAbort = useCallback(async () => {
    controller.current.abort();
    controller.current = new AbortController();

    const signal = controller.current.signal;

    const promise = fn(createAutoAbortedClient(signal, http));
    // if `fn` doesn't return a promise it is a signal that data fetching was not initiated.
    // This can happen if the data fetching is conditional (based on certain inputs).
    // In these cases it is not desirable to invoke the global loading spinner, or change the status to success
    if (!promise) {
      return;
    }

    setResult((prevResult) => ({
      data: preservePreviousData ? prevResult.data : undefined, // preserve data from previous state while loading next state
      status: FETCH_STATUS.LOADING,
      error: undefined,
    }));

    try {
      const data = await promise;
      // when http fetches are aborted, the promise will be rejected
      // and this code is never reached. For async operations that are
      // not cancellable, we need to check whether the signal was
      // aborted before updating the result.
      if (!signal.aborted) {
        setResult({
          data,
          status: FETCH_STATUS.SUCCESS,
          error: undefined,
        } as FetcherResult<InferApiCallReturnType<Fn>>);
      }

      return data;
    } catch (e) {
      const err = e as InfraHttpError;

      if (!signal.aborted) {
        const errorDetails = err.response
          ? getDetailsFromErrorResponse(err)
          : err.body?.message ?? err.message;

        if (showToastOnError) {
          notifications.toasts.danger({
            toastLifeTimeMs: 3000,
            title: i18n.translate('xpack.infra.useHTTPRequest.error.title', {
              defaultMessage: `Error while fetching resource`,
            }),
            body: (
              <div>
                <h5>
                  {i18n.translate('xpack.infra.fetcher.error.status', {
                    defaultMessage: `Error`,
                  })}
                </h5>

                {errorDetails}
              </div>
            ),
          });
        }
        setResult({
          data: undefined,
          status: FETCH_STATUS.FAILURE,
          error: e,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, fnDeps);

  const triggerFetch = useCallback(() => {
    if (requestObservable$) {
      requestObservable$.next(fetchWithAbort);
    } else {
      fetchWithAbort();
    }
  }, [requestObservable$, fetchWithAbort]);

  useEffect(() => {
    // Allows the caller of useFetcher to control when the fetch can be triggered
    if (autoFetch) {
      setCachedSearchSessionId(searchSessionId);
    }
    autoFetchRef.current = autoFetch;
  }, [autoFetch, searchSessionId]);

  useEffect(() => {
    return () => {
      controller.current.abort();
    };
  }, []);

  useEffect(() => {
    if (autoFetchRef.current) {
      triggerFetch();
    }
  }, [autoFetchRef, fetchWithAbort, cachedSearchSessionId, triggerFetch]);

  return useMemo(
    () => ({
      ...result,
      refetch: triggerFetch,
    }),
    [result, triggerFetch]
  );
}
