/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { getRetrieveOrGenerate } from './get_retrieve_or_generate';
import type { GraphState } from '../../types';

export const getRetrieveAnonymizedAlertsOrGenerateEdge = (logger?: Logger) => {
  const edge = (state: GraphState): 'retrieve_anonymized_alerts' | 'generate' => {
    logger?.debug(() => '---RETRIEVE ANONYMIZED ALERTS OR GENERATE---');
    const { anonymizedAlerts } = state;

    const decision = getRetrieveOrGenerate(anonymizedAlerts);

    logger?.debug(
      () =>
        `retrieveAnonymizedAlertsOrGenerateEdge evaluated the following (derived) state:\n${JSON.stringify(
          {
            anonymizedAlerts: anonymizedAlerts.length,
          },
          null,
          2
        )}
        \n---RETRIEVE ANONYMIZED ALERTS OR GENERATE: ${decision}---`
    );

    return decision;
  };

  return edge;
};
