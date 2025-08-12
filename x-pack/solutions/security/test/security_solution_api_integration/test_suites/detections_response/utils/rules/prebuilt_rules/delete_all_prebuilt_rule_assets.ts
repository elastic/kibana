/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { retryIfDeleteByQueryConflicts } from '../../retry_delete_by_query_conflicts';

/**
 * Remove all prebuilt rule assets from the security solution savedObjects index
 * @param es The ElasticSearch handle
 */
export const deleteAllPrebuiltRuleAssets = async (
  es: Client,
  logger: ToolingLog
): Promise<void> => {
  await retryIfDeleteByQueryConflicts(logger, deleteAllPrebuiltRuleAssets.name, async () => {
    return await es.deleteByQuery({
      index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
      q: 'type:security-rule',
      wait_for_completion: true,
      refresh: true,
      body: {},
    });
  });
};
