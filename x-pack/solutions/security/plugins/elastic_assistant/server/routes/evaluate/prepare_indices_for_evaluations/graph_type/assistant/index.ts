/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { PrepareIndicesForEvaluations } from '../../prepare_indices_for_evalutations';
import { indicesCreateRequests } from './indices_create_requests';

export class PrepareIndicesForAssistantGraphEvalusations extends PrepareIndicesForEvaluations {
  constructor({ esClient, logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    super({
      esClient,
      indicesCreateRequests: Object.values(indicesCreateRequests),
      logger,
    });
  }
}
