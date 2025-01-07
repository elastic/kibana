/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
  MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/constants';
import { keyBy } from 'lodash';
import type { MicrosoftDefenderEndpointMachine } from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { AgentStatusClientError } from '../errors';
import { getPendingActionsSummary, NormalizedExternalConnectorClient } from '../../..';
import type { AgentStatusClientOptions } from '../lib/base_agent_status_client';
import { AgentStatusClient } from '../lib/base_agent_status_client';
import type { AgentStatusRecords } from '../../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../../common/endpoint/types';

export class MicrosoftDefenderEndpointAgentStatusClient extends AgentStatusClient {
  protected readonly agentType: ResponseActionAgentType = 'microsoft_defender_endpoint';

  protected readonly connectorActions: NormalizedExternalConnectorClient;

  constructor(options: AgentStatusClientOptions) {
    super(options);

    if (!options.connectorActionsClient) {
      throw new AgentStatusClientError(
        'connectorActionsClient is required to create an instance of MicrosoftDefenderEndpointAgentStatusClient'
      );
    }

    this.connectorActions = new NormalizedExternalConnectorClient(
      options.connectorActionsClient,
      this.log
    );
    this.connectorActions.setup(MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID);
  }

  protected getAgentStatusFromMachineHealthStatus(
    healthStatus: MicrosoftDefenderEndpointMachine['healthStatus'] | undefined
  ): HostStatus {
    // Definition of sensor health status can be found here:
    // https://learn.microsoft.com/en-us/defender-endpoint/check-sensor-status

    switch (healthStatus) {
      case 'Active':
        return HostStatus.HEALTHY;

      case 'Inactive':
        return HostStatus.INACTIVE;

      case 'ImpairedCommunication':
      case 'NoSensorData':
      case 'NoSensorDataImpairedCommunication':
        return HostStatus.UNHEALTHY;

      default:
        return HostStatus.UNENROLLED;
    }
  }

  public async getAgentStatuses(agentIds: string[]): Promise<AgentStatusRecords> {
    const esClient = this.options.esClient;
    const metadataService = this.options.endpointService.getEndpointMetadataService();

    const [{ value: machineList }, allPendingActions] = await Promise.all([
      // FIXME:PT need to update connector to include a getAgentDetailsList() method
      this.connectorActions
        .execute({
          params: {
            subAction: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_AGENT_DETAILS,
            subActionParams: { id: agentIds[0] },
          },
        })
        .then<{ value: MicrosoftDefenderEndpointMachine[] }>((response) => {
          // FIXME:PT remove this once we have new method to get list of machines
          // This attempts to mimic what the return structure will be once the new method is implemented
          return {
            value: [response.data],
          };
        }),

      // Fetch pending actions summary
      getPendingActionsSummary(esClient, metadataService, this.log, agentIds),
    ]);

    const machinesById = keyBy(machineList, 'id');
    const pendingActionsByAgentId = keyBy(allPendingActions, 'agent_id');

    const response = agentIds.reduce<AgentStatusRecords>((acc, agentId) => {
      const thisMachine = machinesById[agentId];
      const thisAgentPendingActions = pendingActionsByAgentId[agentId];

      acc[agentId] = {
        agentId,
        agentType: this.agentType,
        found: !!thisMachine,
        // Unfortunately, it does not look like MS Defender has a way to determine
        // if a host is isolated or not via API, so we just set this to false
        isolated: false,
        lastSeen: thisMachine.lastSeen,
        status: this.getAgentStatusFromMachineHealthStatus(thisMachine?.healthStatus),
        pendingActions: thisAgentPendingActions.pending_actions ?? {},
      };

      return acc;
    }, {});

    return response;
  }
}
