/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DetectionClient } from './detection_client';
import type { DetectionDataStreamClient } from './detection_client';

export class DetectionService {
  getClient({
    dataStreamClient,
    esClient,
    space,
  }: {
    dataStreamClient: DetectionDataStreamClient;
    esClient: ElasticsearchClient;
    space: string;
  }): DetectionClient {
    return new DetectionClient({
      dataStreamClient,
      esClient,
      space,
    });
  }
}
