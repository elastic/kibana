/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { BaseGraphState, GraphInsightTypes } from '../../../graphs';

export const getGenerateOrEndEdge = <T extends GraphInsightTypes>(logger?: Logger) => {
  const edge = (state: BaseGraphState<T>): 'end' | 'generate' => {
    logger?.debug(() => '---GENERATE OR END---');
    const { anonymizedDocuments } = state;

    const hasZeroDocs = !anonymizedDocuments.length;
    const decision = hasZeroDocs ? 'end' : 'generate';

    logger?.debug(
      () => `generatOrEndEdge evaluated the following (derived) state:\n${JSON.stringify(
        {
          anonymizedDocuments: anonymizedDocuments.length,
          hasZeroDocs,
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
