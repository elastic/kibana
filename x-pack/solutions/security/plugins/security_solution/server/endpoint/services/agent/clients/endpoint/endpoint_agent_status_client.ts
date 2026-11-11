/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchAndWrapError } from '../../../../utils';
import { type AgentStatusRecords, HostStatus } from '../../../../../../common/endpoint/types';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { AgentStatusClient } from '../lib/base_agent_status_client';
import { getPendingActionsSummary } from '../../../actions';

export class EndpointAgentStatusClient extends AgentStatusClient {
  protected readonly agentType: ResponseActionAgentType = 'endpoint';

  async getAgentStatuses(agentIds: string[]): Promise<AgentStatusRecords> {
    const soClient = this.options.soClient;
    const metadataService = this.options.endpointService.getEndpointMetadataService(
      soClient.getCurrentNamespace()
    );

    try {
      const agentIdsKql = agentIds.map((agentId) => `agent.id: ${agentId}`).join(' or ');
      const [{ data: hostInfoForAgents }, allPendingActions] = await Promise.all([
        // The scoped services are threaded through so this read can fan out under CPS. Without it the
        // read is origin-only, an agent enrolled in a linked project is simply not found, and the
        // status below falls back to offline for a host the endpoint list is showing as healthy.
        metadataService.getHostMetadataList(
          {
            page: 0,
            pageSize: 1000,
            kuery: agentIdsKql,
          },
          this.options.scoped
        ),
        getPendingActionsSummary(this.options.endpointService, this.options.spaceId, agentIds),
      ]).catch(catchAndWrapError);

      return agentIds.reduce<AgentStatusRecords>((acc, agentId) => {
        const agentMetadata = hostInfoForAgents.find(
          (hostInfo) => hostInfo.metadata.agent.id === agentId
        );

        const pendingActions = allPendingActions.find(
          (agentPendingActions) => agentPendingActions.agent_id === agentId
        );

        acc[agentId] = {
          agentId,
          agentType: this.agentType,
          found: agentMetadata !== undefined,
          isolated: Boolean(agentMetadata?.metadata.Endpoint.state?.isolation),
          lastSeen: agentMetadata?.last_checkin || '',
          pendingActions: pendingActions?.pending_actions ?? {},
          status: agentMetadata?.host_status || HostStatus.OFFLINE,
        };

        return acc;
      }, {});
    } catch (err) {
      return this.handleUnexpectedFailureAndReturnDefaultResponse(agentIds, err);
    }
  }
}
