/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { getExportProviders } from '../../../../../common/endpoint/models/export_providers';
import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '../../../../../common/endpoint/service/response_actions/constants';
import type { ExportProvider, PolicyData } from '../../../../../common/endpoint/types';
import { NotFoundError } from '../../../errors';
import { EndpointHostNotFoundError } from '../../metadata';
import { catchAndWrapError } from '../../../utils/wrap_errors';
import type { EndpointAppContextService } from '../../../endpoint_app_context_services';

export interface GetExportProvidersForAgentOptions {
  endpointService: EndpointAppContextService;
  spaceId: string;
  /** Fleet agent id of the host */
  agentId: string;
}

/** The export providers in the Elastic Defend policy Fleet has assigned to the agent, resolved like action dispatch does. */
export const getExportProvidersForAgent = async ({
  endpointService,
  spaceId,
  agentId,
}: GetExportProvidersForAgentOptions): Promise<ExportProvider[]> => {
  const [host] = await endpointService
    .getEndpointMetadataService(spaceId)
    .getMetadataForEndpoints([agentId]);

  if (!host) {
    throw new EndpointHostNotFoundError(`Endpoint with id ${agentId} not found`);
  }

  const fleetAgentId = host.elastic.agent.id;
  const fleetServices = endpointService.getInternalFleetServices(spaceId);
  const soClient = fleetServices.savedObjects.createInternalScopedSoClient({ spaceId });

  const [agent] = await fleetServices.fetchAgentsById([fleetAgentId]).catch(catchAndWrapError);

  if (!agent || !agent.policy_id) {
    throw new NotFoundError(`Agent [${fleetAgentId}] is not assigned to an agent policy`);
  }

  const agentPolicyId = agent.policy_id;
  const integrations = RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES.endpoint;
  const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: (${integrations.join(
    ' OR '
  )}) AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.policy_ids: ("${escapeQuotes(agentPolicyId)}")`;

  const { items: integrationPolicies } = await fleetServices.packagePolicy
    .list(soClient, { perPage: 10_000, kuery })
    .catch(catchAndWrapError);

  const packagePolicy = integrationPolicies.find(
    (policy) =>
      policy.policy_ids.includes(agentPolicyId) && integrations.includes(policy.package?.name ?? '')
  );

  if (!packagePolicy) {
    throw new NotFoundError(
      `No Elastic Defend integration policy found for agent policy [${agentPolicyId}]`
    );
  }

  return getExportProviders((packagePolicy as PolicyData).inputs[0].config.policy.value);
};
