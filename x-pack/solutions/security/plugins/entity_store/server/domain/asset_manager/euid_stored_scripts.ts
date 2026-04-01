/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getEuidPainlessEvaluation } from '../../../common/domain/euid/painless';
import type { EntityType } from '../../../common/domain/definitions/entity_schema';
import { putStoredScript, deleteStoredScript } from '../../infra/elasticsearch/scripts';

const storedScriptName: Record<EntityType, string> = {
  user: 'euid_user_entity',
  host: 'euid_host_entity',
  service: 'euid_service_entity',
  generic: 'euid_generic_entity',
} as const satisfies Record<EntityType, string>;

export async function installEuidStoredScripts({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}) {
  logger.debug('Installing/updating EUID stored scripts');

  for (const [type, name] of Object.entries(storedScriptName)) {
    await putStoredScript(esClient, name, getEuidPainlessEvaluation(type as EntityType));
  }
}

export async function deleteEuidStoredScripts({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}) {
  logger.debug('Deleting EUID stored scripts');
  for (const name of Object.values(storedScriptName)) {
    await deleteStoredScript(esClient, name);
  }
}
