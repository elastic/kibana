/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

export const deleteInferenceEndpoint = async (
  client: ElasticsearchClient,
  type: InferenceTaskType,
  id: string,
  scanUsage?: boolean
) => {
  if (scanUsage) {
    return await client.inference.delete({ inference_id: id, task_type: type, dry_run: true });
  }
  return await client.inference.delete({ inference_id: id, task_type: type, force: true });
};
