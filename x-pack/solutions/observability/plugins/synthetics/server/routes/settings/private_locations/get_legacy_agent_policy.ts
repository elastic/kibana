/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { getAgentPolicyInfo } from './helpers';

export const getLegacyAgentPolicyRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.LEGACY_AGENT_POLICIES + '/{agent_policy_id}',
  validate: {
    params: schema.object({
      agent_policy_id: schema.string(),
    }),
  },
  handler: async ({ server, request, response }) => {
    const { agent_policy_id: agentPolicyId } = request.params;
    const soClient = server.coreStart.savedObjects.createInternalRepository();

    try {
      const agentPolicy = await server.fleet.agentPolicyService.get(soClient, agentPolicyId, true, {
        spaceId: DEFAULT_SPACE_ID,
      });

      if (agentPolicy) {
        return getAgentPolicyInfo(agentPolicy);
      }
    } catch (error) {
      if (error.output.statusCode === 404) {
        return response.notFound({
          body: {
            message: `Agent policy with id "${agentPolicyId}" not found`,
          },
        });
      }
      throw error;
    }
  },
});
