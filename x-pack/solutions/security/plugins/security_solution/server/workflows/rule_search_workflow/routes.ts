/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RULES_API_ALL, RULES_API_READ } from '@kbn/security-solution-features/constants';
import {
  RULE_MANAGEMENT_RULE_SEARCH_INDEX_WORKFLOW_URL,
  RULE_MANAGEMENT_RULE_SEARCH_STATUS_URL,
} from '../../../common/api/detection_engine/rule_management/urls';
import type { StartPlugins } from '../../plugin';
import type { SecuritySolutionPluginRouter } from '../../types';
import { buildSiemResponse } from '../../lib/detection_engine/routes/utils';
import { getRuleSearchStatus } from '../../lib/detection_engine/rule_management/logic/search/semantic';
import { initSecurityManagedWorkflowsClient } from '../managed_workflows';
import { getRuleSearchIndexWorkflowId, installRuleSearchIndexWorkflowForSpace } from './install';
import { isRuleSearchWorkflowEnabled } from './status';

/**
 * `_workflow` installs the rule search index workflow in the current space and returns its id.
 * Boot installs it in every space; this covers a space created after boot. It stays as it is
 * (disabled until an admin enables it in Workflows, which schedules it with that admin's API key).
 * `_status` tells the rules page whether search by meaning is available, off, indexing or ready.
 */
export const registerRuleSearchIndexRoutes = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>,
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'internal',
      path: RULE_MANAGEMENT_RULE_SEARCH_INDEX_WORKFLOW_URL,
      security: { authz: { requiredPrivileges: [RULES_API_ALL] } },
    })
    .addVersion({ version: '1', validate: false }, async (context, _request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const [, { workflowsExtensions }] = await getStartServices();
        if (!workflowsExtensions) {
          return siemResponse.error({ body: 'Workflows are not available', statusCode: 404 });
        }
        const workflowId = await installRuleSearchIndexWorkflowForSpace({
          managedWorkflowsClient: await initSecurityManagedWorkflowsClient(workflowsExtensions),
          spaceId: (await context.securitySolution).getSpaceId(),
        });
        return response.ok({ body: { workflow_id: workflowId } });
      } catch (err) {
        logger.error(`Could not install the rule search index workflow: ${err.message}`);
        const error = transformError(err);
        return siemResponse.error({ body: error.message, statusCode: error.statusCode });
      }
    });

  router.versioned
    .get({
      access: 'internal',
      path: RULE_MANAGEMENT_RULE_SEARCH_STATUS_URL,
      security: { authz: { requiredPrivileges: [RULES_API_READ] } },
    })
    .addVersion({ version: '1', validate: false }, async (context, _request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const [, { workflowsExtensions }] = await getStartServices();
        const ctx = await context.resolve(['core', 'securitySolution']);
        const status = await getRuleSearchStatus({
          esClient: ctx.core.elasticsearch.client.asInternalUser,
          uiSettings: ctx.core.uiSettings.client,
          spaceId: ctx.securitySolution.getSpaceId(),
          isWorkflowEnabled: (spaceId) => isRuleSearchWorkflowEnabled(workflowsExtensions, spaceId),
        });
        return response.ok({
          body: {
            status,
            workflow_id: getRuleSearchIndexWorkflowId(ctx.securitySolution.getSpaceId()),
          },
        });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({ body: error.message, statusCode: error.statusCode });
      }
    });
};
