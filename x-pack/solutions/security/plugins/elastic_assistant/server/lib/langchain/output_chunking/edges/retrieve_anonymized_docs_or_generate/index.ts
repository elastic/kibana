/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { BaseGraphState, GraphInsightTypes } from '../../../graphs';
import { getRetrieveOrGenerate } from './get_retrieve_or_generate';

export const getRetrieveAnonymizedDocsOrGenerateEdge = <T extends GraphInsightTypes>(
  logger?: Logger
) => {
  const edge = (state: BaseGraphState<T>): 'retrieve_anonymized_docs' | 'generate' => {
    logger?.debug(() => '---RETRIEVE ANONYMIZED DOCS OR GENERATE---');
    const { anonymizedDocuments } = state;

    const decision = getRetrieveOrGenerate(anonymizedDocuments);

    logger?.debug(
      () =>
        `retrieveAnonymizedDocsOrGenerateEdge evaluated the following (derived) state:\n${JSON.stringify(
          {
            anonymizedDocuments: anonymizedDocuments.length,
          },
          null,
          2
        )}
        \n---RETRIEVE ANONYMIZED DOCS OR GENERATE: ${decision}---`
    );

    return decision;
  };

  return edge;
};
