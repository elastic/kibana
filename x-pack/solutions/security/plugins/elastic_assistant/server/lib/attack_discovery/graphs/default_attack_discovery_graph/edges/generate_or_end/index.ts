/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { getGenerateOrEndDecision } from './helpers/get_generate_or_end_decision';
import { getHasZeroAlerts } from '../helpers/get_has_zero_alerts';
import type { GraphState } from '../../types';

export const getGenerateOrEndEdge = (logger?: Logger) => {
  const edge = (state: GraphState): 'end' | 'generate' => {
    logger?.debug(() => '---GENERATE OR END---');
    const { anonymizedAlerts } = state;

    const hasZeroAlerts = getHasZeroAlerts(anonymizedAlerts);

    const decision = getGenerateOrEndDecision(hasZeroAlerts);

    logger?.debug(
      () => `generatOrEndEdge evaluated the following (derived) state:\n${JSON.stringify(
        {
          anonymizedAlerts: anonymizedAlerts.length,
          hasZeroAlerts,
        },
        null,
        2
      )}
\n---GENERATE OR END: ${decision}---`
    );
    return decision;
  };

  return edge;
};
