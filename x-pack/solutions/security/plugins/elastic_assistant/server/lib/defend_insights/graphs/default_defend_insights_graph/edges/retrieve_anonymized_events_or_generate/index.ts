/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { GraphState } from '../../types';
import { getRetrieveOrGenerate } from './get_retrieve_or_generate';

export const getRetrieveAnonymizedEventsOrGenerateEdge = (logger?: Logger) => {
  const edge = (state: GraphState): 'retrieve_anonymized_events' | 'generate' => {
    logger?.debug(() => '---RETRIEVE ANONYMIZED EVENTS OR GENERATE---');
    const { anonymizedEvents } = state;

    const decision = getRetrieveOrGenerate(anonymizedEvents);

    logger?.debug(
      () =>
        `retrieveAnonymizedEventsOrGenerateEdge evaluated the following (derived) state:\n${JSON.stringify(
          {
            anonymizedEvents: anonymizedEvents.length,
          },
          null,
          2
        )}
        \n---RETRIEVE ANONYMIZED EVENTS OR GENERATE: ${decision}---`
    );

    return decision;
  };

  return edge;
};
