/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';

/**
 * A committed catalog write, as `SourcesClient` reports it. `onboardImmediately` is what the
 * writer asked for this one write; it is not stored on the source. `_enable` and `_disable` do
 * not take the option and report `true`.
 */
export type SourceChange =
  | { type: 'created'; source: NightshiftSource; onboardImmediately: boolean }
  | {
      type: 'updated';
      source: NightshiftSource;
      previous: NightshiftSource;
      onboardImmediately: boolean;
    }
  | { type: 'deleted'; source: NightshiftSource };

/** A committed catalog write plus the request that made it, so listeners act in its space. */
export type SourceChangeEvent = SourceChange & { request: KibanaRequest };

export type SourceChangeListener = (event: SourceChangeEvent) => Promise<void>;

export interface SourceChangeEmitter {
  /** Registers a listener for every source change; returns the unsubscribe function. */
  subscribe: (listener: SourceChangeListener) => () => void;
  /** Awaits every listener. Failures are logged, never thrown: the write already happened. */
  emit: (event: SourceChangeEvent) => Promise<void>;
}

export const createSourceChangeEmitter = (logger: Logger): SourceChangeEmitter => {
  const listeners = new Set<SourceChangeListener>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit: async (event) => {
      // `async` turns a listener that throws synchronously into a rejection, so it is logged like
      // the others instead of failing a write that already committed.
      const results = await Promise.allSettled(
        [...listeners].map(async (listener) => listener(event))
      );
      results.forEach((result) => {
        if (result.status === 'rejected') {
          logger.error(
            `A listener failed to handle the ${event.type} event of source ${event.source.id}: ${result.reason}`
          );
        }
      });
    },
  };
};
