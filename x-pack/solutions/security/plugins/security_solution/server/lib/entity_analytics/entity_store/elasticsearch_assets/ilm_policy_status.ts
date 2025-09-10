/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityDefinition } from '@kbn/entities-schema';
import {
  generateHistoryILMPolicyId,
  generateResetILMPolicyId,
} from '@kbn/entityManager-plugin/server/lib/entities/helpers/generate_component_id';
import {
  EngineComponentResourceEnum,
  type EngineComponentStatus,
} from '../../../../../common/api/entity_analytics';

interface Options {
  definition: EntityDefinition;
  esClient: ElasticsearchClient;
}

export async function getEntityILMPolicyStatuses({
  definition,
  esClient,
}: Options): Promise<EngineComponentStatus[]> {
  const namesToCheck: string[] = [
    generateResetILMPolicyId(definition),
    generateHistoryILMPolicyId(definition),
  ];
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
