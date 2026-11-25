/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { createTracedEsClient } from '@kbn/traced-es-client';

/** The aggregations a search request asks for, typed from the request as Elasticsearch returns them. */
export type AggregationsOf<TRequest extends ESSearchRequest> = NonNullable<
  InferSearchResponseOf<unknown, TRequest>['aggregations']
>;

/** The app's Elasticsearch client: typed searches, each traced as a named APM span. */
export const createDigitalExperienceTracedEsClient = ({
  client,
  logger,
  abortSignal,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  abortSignal?: AbortSignal;
}): TracedElasticsearchClient => {
  return createTracedEsClient({ client, logger, plugin: 'digitalExperience', abortSignal });
};
