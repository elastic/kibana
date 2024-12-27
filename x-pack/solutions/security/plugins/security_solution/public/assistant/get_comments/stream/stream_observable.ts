/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concatMap, delay, finalize, Observable, of, scan, timestamp } from 'rxjs';
import type { Dispatch, SetStateAction } from 'react';
import type { PromptObservableState } from './types';
import { API_ERROR } from '../translations';
const MIN_DELAY = 35;

interface StreamObservable {
  isError: boolean;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

/**
 * Returns an Observable that reads data from a ReadableStream and emits values representing the state of the data processing.
 *
 * @param isError - indicates whether the reader response is an error message or not
 * @param reader - The ReadableStreamDefaultReader used to read data from the stream.
 * @param setLoading - A function to update the loading state.
 * @returns {Observable<PromptObservableState>} An Observable that emits PromptObservableState
 */
export const getStreamObservable = ({
  isError,
  reader,
  setLoading,
}: StreamObservable): Observable<PromptObservableState> =>
  new Observable<PromptObservableState>((observer) => {
    observer.next({ chunks: [], loading: true });
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    // Initialize an empty string to store the LangChain buffer.
    let langChainBuffer: string = '';

    // read data from LangChain stream
    function readLangChain() {
      reader
        .read()
        .then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
          try {
            if (done) {
              if (langChainBuffer) {
                const finalChunk = getLangChainChunks([langChainBuffer])[0];
                if (finalChunk && finalChunk.length > 0) chunks.push(finalChunk);
              }
              observer.next({
                chunks,
                message: chunks.join(''),
                loading: false,
              });
              observer.complete();
              return;
            }
            const decoded = decoder.decode(value);
            let nextChunks;
            if (isError) {
              nextChunks = [`${API_ERROR}\n\n${JSON.parse(decoded).message}`];
              nextChunks.forEach((chunk: string) => {
                chunks.push(chunk);
                observer.next({
                  chunks,
                  message: chunks.join(''),
                  loading: true,
                });
              });
            } else {
              const output = decoded;
              const lines = output.split('\n');
              lines[0] = langChainBuffer + lines[0];
              langChainBuffer = lines.pop() || '';

              nextChunks = getLangChainChunks(lines);
              nextChunks.forEach((chunk: string) => {
                chunks.push(chunk);
                observer.next({
                  chunks,
                  message: chunks.join(''),
                  loading: true,
                });
              });
            }
          } catch (err) {
            observer.error(err);
            return;
          }
          readLangChain();
        })
        .catch((err) => {
          observer.error(err);
        });
    }
    readLangChain();

    return () => {
      reader.cancel();
    };
  }).pipe(
    // append a timestamp of when each value was emitted
    timestamp(),
    // use the previous timestamp to calculate a target
    // timestamp for emitting the next value
    scan((acc, value) => {
      const lastTimestamp = acc.timestamp || 0;
      const emitAt = Math.max(lastTimestamp + MIN_DELAY, value.timestamp);
      return {
        timestamp: emitAt,
        value: value.value,
      };
    }),
    // add the delay based on the elapsed time
    // using concatMap(of(value).pipe(delay(50))
    // leads to browser issues because timers
    // are throttled when the tab is not active
    concatMap((value) => {
      const now = Date.now();
      const delayFor = value.timestamp - now;

      if (delayFor <= 0) {
        return of(value.value);
      }

      return of(value.value).pipe(delay(delayFor));
    }),
    // set loading to false when the observable completes or errors out
    finalize(() => setLoading(false))
  );

/**
 * Parses a LangChain response from a string.
 * @param lines
 * @returns {string[]} - Parsed string array from the LangChain response.
 */
const getLangChainChunks = (lines: string[]): string[] =>
  lines.reduce((acc: string[], b: string) => {
    if (b.length) {
      try {
        const obj = JSON.parse(b);
        if (obj.type === 'content' && obj.payload.length > 0) {
          return [...acc, obj.payload];
        }
        return acc;
      } catch (e) {
        return acc;
      }
    }
    return acc;
  }, []);

export const getPlaceholderObservable = () => new Observable<PromptObservableState>();
