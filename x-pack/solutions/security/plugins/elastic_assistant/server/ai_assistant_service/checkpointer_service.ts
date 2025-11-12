/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchServiceStart } from '@kbn/core/server';
import { CheckpointerServiceImpl as BaseCheckpointerServiceImpl } from '@kbn/langgraph-checkpoint-saver';
import type { CheckpointerService } from '@kbn/langgraph-checkpoint-saver';

export type { CheckpointerService };

interface CheckpointerServiceDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
}

/**
 * Security-specific checkpointer service that uses the `.kibana-elastic-ai-assistant-` index prefix.
 * This is a thin wrapper around the base CheckpointerServiceImpl from
 * @kbn/langgraph-checkpoint-saver configured with the security index prefix.
 */
export class SecurityCheckpointerServiceImpl extends BaseCheckpointerServiceImpl {
  constructor({ logger, elasticsearch }: CheckpointerServiceDeps) {
    super({
      indexPrefix: '.kibana-elastic-ai-assistant-',
      logger,
      elasticsearch,
    });
  }
}
