/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import {
  SUB_ACTION,
  CROWDSTRIKE_CONNECTOR_ID,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  CrowdstrikeBaseApiResponse,
  CrowdStrikeExecuteRTRResponse,
  CrowdstrikeGetScriptsResponse,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import { v4 as uuidv4 } from 'uuid';

import { CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION } from '../../../../../../common/endpoint/service/response_actions/crowdstrike';
import { mapParametersToCrowdStrikeArguments } from './utils';
import type { CrowdstrikeActionRequestCommonMeta } from '../../../../../../common/endpoint/types/crowdstrike';
import type {
  CommonResponseActionMethodOptions,
  CustomScriptsResponse,
  ProcessPendingActionsMethodOptions,
} from '../../..';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { stringify } from '../../../../utils/stringify';
import { ResponseActionsClientError } from '../errors';
import type {
  ActionDetails,
  EndpointActionData,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  LogsEndpointAction,
  ResponseActionRunScriptOutputContent,
  ResponseActionRunScriptParameters,
} from '../../../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  RunScriptActionRequestBody,
  UnisolationRouteRequestBody,
} from '../../../../../../common/api/endpoint';
import type {
  ResponseActionsClientOptions,
  ResponseActionsClientWriteActionRequestToEndpointIndexOptions,
  ResponseActionsClientValidateRequestResponse,
} from '../lib/base_response_actions_client';
import { ResponseActionsClientImpl } from '../lib/base_response_actions_client';
import type {
  NormalizedExternalConnectorClient,
  NormalizedExternalConnectorClientExecuteOptions,
} from '../lib/normalized_external_connector_client';
import { catchAndWrapError } from '../../../../utils';
import { buildIndexNameWithNamespace } from '../../../../../../common/endpoint/utils/index_name_utilities';

export type CrowdstrikeActionsClientOptions = ResponseActionsClientOptions & {
  connectorActions: NormalizedExternalConnectorClient;
};

interface CrowdstrikeResponseOptions {
  error?:
    | {
        code: string;
        message: string;
      }
    | undefined;
  actionId: string;
  agentId: string | string[];
  data: EndpointActionData<EndpointActionDataParameterTypes, EndpointActionResponseDataOutput>;
}

export class CrowdstrikeActionsClient extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'crowdstrike';
  private readonly connectorActionsClient: NormalizedExternalConnectorClient;

  constructor({ connectorActions, ...options }: CrowdstrikeActionsClientOptions) {
    super(options);
    this.connectorActionsClient = connectorActions;
    connectorActions.setup(CROWDSTRIKE_CONNECTOR_ID);
  }

  /**
   * Returns a list of all indexes for Crowdstrike data supported for response actions
   * @internal
   */
  private async fetchIndexNames(): Promise<string[]> {
    const cachedInfo = this.cache.get<string[]>('fetchIndexNames');

    if (cachedInfo) {
      this.log.debug(
        `Returning cached response with list of index names:\n${stringify(cachedInfo)}`
      );
      return cachedInfo;
    }

    const integrationNames = Object.keys(CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION);
    const fleetServices = this.options.endpointService.getInternalFleetServices(
      this.options.spaceId
    );
    const indexNamespaces = await fleetServices.getIntegrationNamespaces(integrationNames);
    const indexNames: string[] = [];

    for (const [integrationName, namespaces] of Object.entries(indexNamespaces)) {
      if (namespaces.length > 0) {
        const indexPatterns =
          CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION[
            integrationName as keyof typeof CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION
          ];

        for (const indexPattern of indexPatterns) {
          indexNames.push(
            ...namespaces.map((namespace) => buildIndexNameWithNamespace(indexPattern, namespace))
          );
        }
      }
    }

    this.cache.set('fetchIndexNames', indexNames);
    this.log.debug(() => `Crowdstrike indexes with namespace:\n${stringify(indexNames)}`);

    return indexNames;
  }

  protected async fetchAgentPolicyInfo(
    agentIds: string[]
  ): Promise<LogsEndpointAction['agent']['policy']> {
    const cacheKey = `fetchAgentPolicyInfo:${agentIds.sort().join('#')}`;
    const cacheResponse = this.cache.get<LogsEndpointAction['agent']['policy']>(cacheKey);

    if (cacheResponse) {
      this.log.debug(
        () => `Cached agent policy info. found - returning it:\n${stringify(cacheResponse)}`
      );
      return cacheResponse;
    }

    const esClient = this.options.esClient;
    const esSearchRequest: SearchRequest = {
      index: await this.fetchIndexNames(),
      query: { bool: { filter: [{ terms: { 'device.id': agentIds } }] } },
      collapse: {
        field: 'device.id',
        inner_hits: {
          name: 'most_recent',
          size: 1,
          _source: ['agent', 'device.id', 'event.created'],
          sort: [{ 'event.created': 'desc' }],
        },
      },
      _source: false,
      ignore_unavailable: true,
    };

    if (!esSearchRequest.index || esSearchRequest.index.length === 0) {
      throw new ResponseActionsClientError(
        `Unable to build list of indexes while retrieving policy information for Crowdstrike agents [${agentIds.join(
          ', '
        )}]. Check to ensure at least one integration policy exists.`,
        400
      );
    }

    this.log.debug(() => `Searching for agents with:\n${stringify(esSearchRequest)}`);

    // Get the latest ingested document for each agent ID
    const crowdstrikeEsResults = await esClient.search(esSearchRequest).catch(catchAndWrapError);

    this.log.debug(() => `Records found:\n${stringify(crowdstrikeEsResults, 20)}`);

    const agentIdsFound: string[] = [];
    const fleetAgentIdToCrowdstrikeAgentIdMap: Record<string, string> =
      crowdstrikeEsResults.hits.hits.reduce((acc, esDoc) => {
        const doc = esDoc.inner_hits?.most_recent.hits.hits[0]._source;

        if (doc) {
          agentIdsFound.push(doc.device.id);
          acc[doc.agent.id] = doc.device.id;
        }

        return acc;
      }, {} as Record<string, string>);
    const elasticAgentIds = Object.keys(fleetAgentIdToCrowdstrikeAgentIdMap);

    if (elasticAgentIds.length === 0) {
      throw new ResponseActionsClientError(
        `Unable to find elastic agent IDs for Crowdstrike agent ids: [${agentIds.join(', ')}]`,
        400
      );
    }

    // ensure all agent ids were found
    for (const agentId of agentIds) {
      if (!agentIdsFound.includes(agentId)) {
        throw new ResponseActionsClientError(`Crowdstrike agent id [${agentId}] not found`, 404);
      }
    }

    const agentPolicyInfo = await this.fetchFleetInfoForAgents(elasticAgentIds);

    for (const agentInfo of agentPolicyInfo) {
      agentInfo.agentId = fleetAgentIdToCrowdstrikeAgentIdMap[agentInfo.elasticAgentId];
    }

    this.cache.set(cacheKey, agentPolicyInfo);
    return agentPolicyInfo;
  }

  protected async writeActionRequestToEndpointIndex<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    actionRequest: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      TParameters,
      TOutputContent,
      TMeta
    >
  ): Promise<
    LogsEndpointAction<TParameters, TOutputContent, TMeta & CrowdstrikeActionRequestCommonMeta>
  > {
    const agentId = actionRequest.endpoint_ids[0];
    const hostname = await this.getHostNameByAgentId(agentId);

    return super.writeActionRequestToEndpointIndex({
      ...actionRequest,
      hosts: {
        [agentId]: { name: hostname },
      },
      meta: {
        hostName: hostname,
        ...(actionRequest.meta ?? {}),
      } as TMeta & CrowdstrikeActionRequestCommonMeta,
    });
  }

  /**
   * Sends actions to Crowdstrike directly (via Connector)
   * @internal
   */
  private async sendAction(
    actionType: SUB_ACTION,
    actionParams: object
  ): Promise<ActionTypeExecutorResult<unknown>> {
    const executeOptions: NormalizedExternalConnectorClientExecuteOptions = {
      params: {
        subAction: actionType,
        subActionParams: actionParams,
      },
    };

    this.log.debug(
      () =>
        `calling connector actions 'execute()' for Crowdstrike with:\n${stringify(executeOptions)}`
    );

    const actionSendResponse = await this.connectorActionsClient.execute(executeOptions);

    if (actionSendResponse.status === 'error') {
      this.log.error(stringify(actionSendResponse));

      throw new ResponseActionsClientError(
        `Attempt to send [${actionType}] to Crowdstrike failed: ${
          actionSendResponse.serviceMessage || actionSendResponse.message
        }`,
        500,
        actionSendResponse
      );
    } else {
      this.log.debug(() => `Response:\n${stringify(actionSendResponse)}`);
    }

    return actionSendResponse;
  }

  private async getHostNameByAgentId(agentId: string): Promise<string> {
    const search = {
      // Multiple indexes:  .falcon, .fdr, .host, .alert
      index: ['logs-crowdstrike*'],
      size: 1,
      _source: ['host.hostname', 'host.name'],
      query: {
        bool: {
          filter: [{ term: { 'device.id': agentId } }],
        },
      },
    };
    try {
      const result: SearchResponse<{ host: { name: string; hostname: string } }> =
        await this.options.esClient.search<{ host: { name: string; hostname: string } }>(search, {
          ignore: [404],
        });

      // Check if host name exists
      const host = result.hits.hits?.[0]?._source?.host;
      const hostName = host?.name || host?.hostname;
      if (!hostName) {
        throw new ResponseActionsClientError(
          `Host name not found in the event document for agentId: ${agentId}`,
          404
        );
      }

      return hostName;
    } catch (err) {
      throw new ResponseActionsClientError(
        `Failed to fetch event document: ${err.message}`,
        err.statusCode ?? 500,
        err
      );
    }
  }

  protected async validateRequest(
    payload: ResponseActionsClientWriteActionRequestToEndpointIndexOptions
  ): Promise<ResponseActionsClientValidateRequestResponse> {
    // TODO:PT support multiple agents
    if (payload.endpoint_ids.length > 1) {
      return {
        isValid: false,
        error: new ResponseActionsClientError(
          `[body.endpoint_ids]: Multiple agents IDs not currently supported for Crowdstrike`,
          400
        ),
      };
    }

    return super.validateRequest(payload);
  }

  async isolate(
    actionRequest: IsolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'isolate',
    };
    let actionResponse: ActionTypeExecutorResult<CrowdstrikeBaseApiResponse> | undefined;
    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;
      if (!error) {
        if (!reqIndexOptions.actionId) {
          reqIndexOptions.actionId = uuidv4();
        }

        try {
          actionResponse = (await this.sendAction(SUB_ACTION.HOST_ACTIONS, {
            ids: actionRequest.endpoint_ids,
            actionParameters: { comment: this.buildExternalComment(reqIndexOptions) },
            command: 'contain',
          })) as ActionTypeExecutorResult<CrowdstrikeBaseApiResponse>;
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const actionRequestDoc = await this.writeActionRequestToEndpointIndex(reqIndexOptions);

    // Ensure actionResponse is assigned before using it
    if (actionResponse) {
      await this.completeCrowdstrikeAction(actionResponse, actionRequestDoc);
    }

    await this.updateCases({
      command: reqIndexOptions.command,
      caseIds: reqIndexOptions.case_ids,
      alertIds: reqIndexOptions.alert_ids,
      actionId: actionRequestDoc.EndpointActions.action_id,
      hosts: actionRequest.endpoint_ids.map((agentId) => {
        return {
          hostId: agentId,
          hostname: actionRequestDoc.EndpointActions.data.hosts?.[agentId].name ?? '',
        };
      }),
      comment: reqIndexOptions.comment,
    });

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  async release(
    actionRequest: UnisolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'unisolate',
    };

    let actionResponse: ActionTypeExecutorResult<CrowdstrikeBaseApiResponse> | undefined;
    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          actionResponse = (await this.sendAction(SUB_ACTION.HOST_ACTIONS, {
            ids: actionRequest.endpoint_ids,
            command: 'lift_containment',
            comment: this.buildExternalComment(reqIndexOptions),
          })) as ActionTypeExecutorResult<CrowdstrikeBaseApiResponse>;
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const actionRequestDoc = await this.writeActionRequestToEndpointIndex(reqIndexOptions);

    // Ensure actionResponse is assigned before using it
    if (actionResponse) {
      await this.completeCrowdstrikeAction(actionResponse, actionRequestDoc);
    }

    await this.updateCases({
      command: reqIndexOptions.command,
      caseIds: reqIndexOptions.case_ids,
      alertIds: reqIndexOptions.alert_ids,
      actionId: actionRequestDoc.EndpointActions.action_id,
      hosts: actionRequest.endpoint_ids.map((agentId) => {
        return {
          hostId: agentId,
          hostname: actionRequestDoc.EndpointActions.data.hosts?.[agentId].name ?? '',
        };
      }),
      comment: reqIndexOptions.comment,
    });

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  public async runscript(
    actionRequest: RunScriptActionRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<
    ActionDetails<ResponseActionRunScriptOutputContent, ResponseActionRunScriptParameters>
  > {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      RunScriptActionRequestBody['parameters']
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'runscript',
    };

    let actionResponse: ActionTypeExecutorResult<CrowdStrikeExecuteRTRResponse> | undefined;
    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;
      if (!error) {
        if (!reqIndexOptions.actionId) {
          reqIndexOptions.actionId = uuidv4();
        }

        try {
          actionResponse = (await this.sendAction(SUB_ACTION.EXECUTE_ADMIN_RTR, {
            actionParameters: { comment: this.buildExternalComment(reqIndexOptions) },
            command: mapParametersToCrowdStrikeArguments('runscript', actionRequest.parameters),
            endpoint_ids: actionRequest.endpoint_ids,
          })) as ActionTypeExecutorResult<CrowdStrikeExecuteRTRResponse>;
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const actionRequestDoc = await this.writeActionRequestToEndpointIndex(reqIndexOptions);

    // Ensure actionResponse is assigned before using it
    if (actionResponse) {
      await this.completeCrowdstrikeBatchAction(actionResponse, actionRequestDoc);
    }

    await this.updateCases({
      command: reqIndexOptions.command,
      caseIds: reqIndexOptions.case_ids,
      alertIds: reqIndexOptions.alert_ids,
      actionId: actionRequestDoc.EndpointActions.action_id,
      hosts: actionRequest.endpoint_ids.map((agentId) => {
        return {
          hostId: agentId,
          hostname: actionRequestDoc.EndpointActions.data.hosts?.[agentId].name ?? '',
        };
      }),
      comment: reqIndexOptions.comment,
    });

    return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
  }

  private async completeCrowdstrikeBatchAction(
    actionResponse: ActionTypeExecutorResult<CrowdStrikeExecuteRTRResponse>,
    doc: LogsEndpointAction
  ): Promise<void> {
    const agentId = doc.agent.id as string;
    const stdout = actionResponse.data?.combined.resources[agentId].stdout || '';
    const stderr = actionResponse.data?.combined.resources[agentId].stderr || '';
    const error = actionResponse.data?.combined.resources[agentId].errors?.[0];
    const options: CrowdstrikeResponseOptions = {
      actionId: doc.EndpointActions.action_id,
      agentId,
      data: {
        ...doc.EndpointActions.data,
        output: {
          content: {
            stdout,
            stderr,
            code: '200',
          },
          type: 'text' as const,
        },
      },
      ...(error
        ? {
            error: {
              code: error.code,
              message: `Crowdstrike action failed: ${error.message}`,
            },
          }
        : {}),
    };

    const responseDoc = await this.writeActionResponseToEndpointIndex(options);
    // telemetry event for completed action
    await this.sendActionResponseTelemetry([responseDoc]);
  }

  private async completeCrowdstrikeAction(
    actionResponse: ActionTypeExecutorResult<CrowdstrikeBaseApiResponse>,
    doc: LogsEndpointAction
  ): Promise<void> {
    const options: CrowdstrikeResponseOptions = {
      actionId: doc.EndpointActions.action_id,
      agentId: doc.agent.id,
      data: doc.EndpointActions.data,
      ...(actionResponse?.data?.errors?.length
        ? {
            error: {
              code: '500',
              message: `Crowdstrike action failed: ${actionResponse.data.errors[0].message}`,
            },
          }
        : {}),
    };

    const responseDoc = await this.writeActionResponseToEndpointIndex(options);
    // telemetry event for completed action
    await this.sendActionResponseTelemetry([responseDoc]);
  }

  async getCustomScripts(): Promise<CustomScriptsResponse> {
    try {
      const customScriptsResponse = (await this.sendAction(
        SUB_ACTION.GET_RTR_CLOUD_SCRIPTS,
        {}
      )) as ActionTypeExecutorResult<CrowdstrikeGetScriptsResponse>;

      const resources = customScriptsResponse.data?.resources || [];
      // Transform CrowdStrike script resources to CustomScriptsResponse format
      const data = resources.map((script) => ({
        // due to External EDR's schema nature - we expect a maybe() everywhere - empty strings are needed
        id: script.id || '',
        name: script.name || '',
        description: script.description || '',
      }));
      return { data } as CustomScriptsResponse;
    } catch (err) {
      const error = new ResponseActionsClientError(
        `Failed to fetch Crowdstrike scripts, failed with: ${err.message}`,
        500,
        err
      );
      this.log.error(error);
      throw error;
    }
  }

  async processPendingActions({
    abortSignal,
    addToQueue,
  }: ProcessPendingActionsMethodOptions): Promise<void> {
    // TODO:PT implement resolving of pending crowdstrike actions
    // if (abortSignal.aborted) {
    //   return;
    // }
  }
}
