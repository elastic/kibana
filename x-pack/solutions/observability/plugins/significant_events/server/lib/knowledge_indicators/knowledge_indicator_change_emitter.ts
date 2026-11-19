/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';

/** A committed write to the knowledge indicators of some sources, and the request that made it. */
export interface KnowledgeIndicatorsChangeEvent {
  /** The request that wrote the knowledge indicators, so a listener acts in its space. */
  request: KibanaRequest;
  spaceId: string;
  /** The sources whose knowledge indicators changed. */
  sourceIds: string[];
}

export type KnowledgeIndicatorsChangeListener = (
  event: KnowledgeIndicatorsChangeEvent
) => Promise<void> | void;

export interface KnowledgeIndicatorChangeEmitter {
  /** Registers a listener for every committed write; returns the unsubscribe function. */
  subscribe: (listener: KnowledgeIndicatorsChangeListener) => () => void;
  /** Calls every listener. Failures are logged, never thrown: the write already happened. */
  emit: (event: KnowledgeIndicatorsChangeEvent) => Promise<void>;
}

export const createKnowledgeIndicatorChangeEmitter = (
  logger: Logger
): KnowledgeIndicatorChangeEmitter => {
  const listeners = new Set<KnowledgeIndicatorsChangeListener>();

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
            `A listener failed to handle the knowledge indicator change of sources [${event.sourceIds.join(
              ', '
            )}]: ${result.reason}`
          );
        }
      });
    },
  };
};
