/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import { RULE_MANAGEMENT_RULE_SEARCH_INDEX_SYNC_URL } from '../../../../../../../common/api/detection_engine/rule_management/urls';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';
import { syncRuleSearchIndex } from '../../../logic/search/semantic';

/**
 * Brings the rule search index of the current space up to date now, instead of on the next
 * semantic search. Rules are read as the user, so only the rules the user can read are indexed.
 */
export const syncRuleSearchIndexRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: RULE_MANAGEMENT_RULE_SEARCH_INDEX_SYNC_URL,
      security: { authz: { requiredPrivileges: [RULES_API_READ] } },
    })
    .addVersion({ version: '1', validate: false }, async (context, _request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
        const result = await syncRuleSearchIndex({
          rulesClient: await ctx.alerting.getRulesClient(),
          esClient: ctx.core.elasticsearch.client.asInternalUser,
          spaceId: ctx.securitySolution.getSpaceId(),
          logger,
        });
        return response.ok({ body: result });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({ body: error.message, statusCode: error.statusCode });
      }
    });
};
