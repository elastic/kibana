/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ENTITY_HISTORY_ILM_POLICY } from '@kbn/entityManager-plugin/common/constants_entities';
import {
  EngineComponentResourceEnum,
  type EngineComponentStatus,
} from '../../../../../common/api/entity_analytics';

interface Options {
  esClient: ElasticsearchClient;
  isServerless: boolean;
}

export async function getEntityILMPolicyStatuses({
  esClient,
  isServerless,
}: Options): Promise<EngineComponentStatus[]> {
  if (isServerless) {
    return Promise.resolve([]);
  }
  const namesToCheck: string[] = [ENTITY_HISTORY_ILM_POLICY];
  const result: EngineComponentStatus[] = await Promise.all(
    namesToCheck.map(async (name) => {
      let exists: boolean = false;
      try {
        await esClient.ilm.getLifecycle({ name });
        exists = true;
      } catch (e) {
        exists = false;
      }
      return { id: name, installed: exists, resource: EngineComponentResourceEnum.ilm_policy };
    })
  );
  return result;
}
