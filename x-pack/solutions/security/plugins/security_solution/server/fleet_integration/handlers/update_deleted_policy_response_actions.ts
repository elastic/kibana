/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepReadonly } from 'utility-types';
import type { PostDeletePackagePoliciesResponse } from '@kbn/fleet-plugin/common';
import { ensureActionRequestsIndexIsConfigured } from '../../endpoint/services';
import { catchAndWrapError } from '../../endpoint/utils';
import { ENDPOINT_ACTIONS_INDEX } from '../../../common/endpoint/constants';
import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '../../../common/endpoint/service/response_actions/constants';
import { stringify } from '../../endpoint/utils/stringify';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';

export const updateDeletedPolicyResponseActions = async (
  endpointService: EndpointAppContextService,
  deletedIntegrationPolicies: DeepReadonly<PostDeletePackagePoliciesResponse>
): Promise<void> => {
  const logger = endpointService.createLogger('updateDeletedPolicyResponseActions');

  if (!endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
    logger.debug(`Space awareness feature flag is disabled. Nothing to do`);
    return;
  }

  logger.debug(
    `Checking if response action requests need to be updated for deleted integration policies`
  );

  // Ensure index has required mappings
  await ensureActionRequestsIndexIsConfigured(endpointService);

  const packageNames = Object.values(RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES).flat();
  const policyIds: string[] = [];

  for (const deletedPolicy of deletedIntegrationPolicies) {
    if (deletedPolicy.success && packageNames.includes(deletedPolicy?.package?.name ?? '')) {
      policyIds.push(deletedPolicy.id);
    }
  }

  logger.debug(
    () =>
      `Looking at deleted integration policies matching package.name of [${packageNames.join(
        ' | '
      )}] found the following integration policy ids: ${stringify(policyIds)}`
  );

  if (policyIds.length > 0) {
    const esClient = endpointService.getInternalEsClient();

    try {
      const updateResponse = await esClient
        .updateByQuery({
          index: ENDPOINT_ACTIONS_INDEX,
          conflicts: 'proceed',
          refresh: false,
          ignore_unavailable: true,
          query: {
            bool: {
              filter: {
                terms: { 'agent.policy.integrationPolicyId': policyIds },
              },
            },
          },
          script: {
            lang: 'painless',
            // FIXME:PT REPLACE tag value below with variable defined in PR #224329
            source: `
if (ctx._source.containsKey('tags')) {
  ctx._source.tags.add('INTEGRATION-POLICY-DELETED');
} else {
  ctx._source.tags = ['INTEGRATION-POLICY-DELETED'];
}
`,
          },
        })
        .catch(catchAndWrapError);

      logger.debug(
        `Update of response actions that reference integration policy ids [${policyIds.join(
          ' | '
        )}] done:\n${stringify(updateResponse)}`
      );

      if (updateResponse.failures?.length) {
        logger.error(
          `The following response action updates (as a result of deleted integration policy) failed:${stringify(
            updateResponse.failures
          )}`
        );
      }
    } catch (err) {
      logger.error(
        `Attempt to updateByQuery() response actions that reference deleted policy ids [${policyIds.join(
          ' | '
        )}] failed with: ${err.message}`,
        { error: err }
      );
    }
  }
};
