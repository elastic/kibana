/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { FindSLOHealthParams } from '@kbn/slo-schema';

export class FindHealth {
  constructor(
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private spaceId: string
  ) {}

  public async execute(params: FindSLOHealthParams) {}
}
