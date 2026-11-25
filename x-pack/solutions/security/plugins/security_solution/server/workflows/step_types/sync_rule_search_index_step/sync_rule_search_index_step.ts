/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { syncRuleSearchIndexStepCommonDefinition } from '../../../../common/workflows/step_types/sync_rule_search_index_step/sync_rule_search_index_step_common';
import { syncRuleSearchIndex } from '../../../lib/detection_engine/rule_management/logic/search/semantic';

export interface SyncRuleSearchIndexStepDependencies {
  getRulesClient: (request: KibanaRequest, spaceId: string) => Promise<RulesClient>;
  getInternalEsClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
}

/**
 * Rules are read with the workflow's request, so RBAC of the user who enabled the workflow
 * applies; the index is written with the internal user (`kibana_system` may write `.kibana*`).
 */
export const createSyncRuleSearchIndexStepDefinition = ({
  getRulesClient,
  getInternalEsClient,
  logger,
}: SyncRuleSearchIndexStepDependencies) =>
  createServerStepDefinition({
    ...syncRuleSearchIndexStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const [rulesClient, esClient] = await Promise.all([
        getRulesClient(context.contextManager.getFakeRequest(), spaceId),
        getInternalEsClient(),
      ]);
      const output = await syncRuleSearchIndex({ rulesClient, esClient, spaceId, logger });
      return { output };
    },
  });
