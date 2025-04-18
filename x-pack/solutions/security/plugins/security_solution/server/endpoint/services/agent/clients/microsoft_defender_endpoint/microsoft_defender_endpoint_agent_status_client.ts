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
import type {
  MicrosoftDefenderEndpointAgentListResponse,
  MicrosoftDefenderEndpointGetActionsParams,
  MicrosoftDefenderEndpointGetActionsResponse,
  MicrosoftDefenderEndpointMachine,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import pMap from 'p-map';
import { stringify } from '../../../../utils/stringify';
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

  protected async calculateHostIsolatedState(agentIds: string[]): Promise<Record<string, boolean>> {
    const response: Record<string, boolean> = {};
    const errors: string[] = [];

    await pMap(
      agentIds,
      async (agentId) => {
        response[agentId] = false;

        try {
          // Microsoft's does not seem to have a public API that enables us to get the Isolation state for a machine. To
          // get around this, we query the list of machine actions for each host and look at the last successful
          // Isolate or Unisolate action to determine if host is isolated or not.
          const { data: hostLastSuccessfulMachineAction } = await this.connectorActions.execute<
            MicrosoftDefenderEndpointGetActionsResponse,
            MicrosoftDefenderEndpointGetActionsParams
          >({
            params: {
              subAction: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS,
              subActionParams: {
                status: 'Succeeded',
                type: ['Isolate', 'Unisolate'],
                machineId: agentId,
                pageSize: 1,
                sortField: 'lastUpdateDateTimeUtc',
                sortDirection: 'desc',
              },
            },
          });

          if (hostLastSuccessfulMachineAction?.value?.[0].type === 'Isolate') {
            response[agentId] = true;
          }
        } catch (err) {
          errors.push(err.message);
        }
      },
      { concurrency: 2 }
    );

    if (errors.length > 0) {
      this.log.error(
        `Attempt to calculate isolate state for Microsoft Defender hosts generated the following errors:\n${errors.join(
          '\n'
        )}`
      );
    }

    this.log.debug(() => `Microsoft agents isolated state:\n${stringify(response)}`);

    return response;
  }

  public async getAgentStatuses(agentIds: string[]): Promise<AgentStatusRecords> {
    try {
      const [{ data: msMachineListResponse }, agentIsolationState, allPendingActions] =
        await Promise.all([
          this.connectorActions.execute<MicrosoftDefenderEndpointAgentListResponse>({
            params: {
              subAction: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_AGENT_LIST,
              subActionParams: { id: agentIds },
            },
          }),

          // Calculate host's current isolation state
          this.calculateHostIsolatedState(agentIds),

          // Fetch pending actions summary
          getPendingActionsSummary(this.options.endpointService, this.options.spaceId, agentIds),
        ]);

      const machinesById = keyBy(msMachineListResponse?.value ?? [], 'id');
      const pendingActionsByAgentId = keyBy(allPendingActions, 'agent_id');

      return agentIds.reduce<AgentStatusRecords>((acc, agentId) => {
        const thisMachine = machinesById[agentId];
        const thisAgentPendingActions = pendingActionsByAgentId[agentId];

        acc[agentId] = {
          agentId,
          agentType: this.agentType,
          found: !!thisMachine,
          isolated: agentIsolationState[agentId] ?? false,
          lastSeen: thisMachine?.lastSeen ?? '',
          status: this.getAgentStatusFromMachineHealthStatus(thisMachine?.healthStatus),
          pendingActions: thisAgentPendingActions?.pending_actions ?? {},
        };

        return acc;
      }, {});
    } catch (err) {
      const error = new AgentStatusClientError(
        `Failed to fetch Microsoft Defender for Endpoint agent status for agentIds: [${agentIds}], failed with: ${err.message}`,
        500,
        err
      );
      this.log.error(error);
      throw error;
    }
  }
}
