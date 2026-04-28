/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { HostStatus } from '../../../../../../common/endpoint/types';
import type { AgentStatusRecords } from '../../../../../../common/endpoint/types/agents';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { EndpointAppContextService } from '../../../../endpoint_app_context_services';
import type { AgentStatusClientInterface } from './types';
import { AgentStatusClientError, AgentStatusNotSupportedError } from '../errors';

export interface AgentStatusClientOptions {
  endpointService: EndpointAppContextService;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  spaceId: string;
  connectorActionsClient?: ActionsClient;
}

export abstract class AgentStatusClient implements AgentStatusClientInterface {
  protected readonly log: Logger;
  protected abstract readonly agentType: ResponseActionAgentType;

  constructor(protected readonly options: AgentStatusClientOptions) {
    this.log = options.endpointService.createLogger(this.constructor.name ?? 'AgentStatusClient');
  }

  protected handleUnexpectedFailureAndReturnDefaultResponse(
    agentIds: string[],
    error: Error
  ): AgentStatusRecords {
    const err = new AgentStatusClientError(
      `Failed to fetch agent status for [${this.agentType}] agentIds: [${agentIds}]: ${error.message}`,
      500,
      error
    );

    this.log.error(err);

    this.log.debug(
      `Returning default response since agent status could not be fetched for [${this.agentType}] hosts`
    );

    return agentIds.reduce<AgentStatusRecords>((acc, agentId) => {
      acc[agentId] = {
        agentId,
        agentType: this.agentType,
        found: false,
        isolated: false,
        lastSeen: '',
        status: HostStatus.OFFLINE,
        pendingActions: {},
        error: error.message,
      };

      return acc;
    }, {});
  }

  public async getAgentStatuses(agentIds: string[]): Promise<AgentStatusRecords> {
    throw new AgentStatusNotSupportedError(agentIds, this.agentType);
  }
}
