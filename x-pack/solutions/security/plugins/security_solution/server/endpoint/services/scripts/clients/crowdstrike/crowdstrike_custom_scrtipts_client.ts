/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CROWDSTRIKE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { CrowdstrikeGetAgentOnlineStatusResponse } from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { CustomScriptsClientError } from '../lib/errors';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { NormalizedExternalConnectorClient } from '../../..';
import { CustomScriptsClient } from '../lib/base_custom_scripts_client';

export class CrowdstrikeCustomScriptsClient extends CustomScriptsClient {
  protected readonly agentType: ResponseActionAgentType = 'crowdstrike';

  private async getCustomScriptsFromConnectorAction(agentIds: string[]) {
    const connectorActions = new NormalizedExternalConnectorClient(
      this.options.connectorActionsClient as ActionsClient,
      this.log
    );
    connectorActions.setup(CROWDSTRIKE_CONNECTOR_ID);

    const customScriptsResponse = (await connectorActions.execute({
      params: {
        subAction: SUB_ACTION.GET_RTR_CLOUD_SCRIPTS,
        subActionParams: {},
      },
    })) as ActionTypeExecutorResult<CrowdstrikeGetAgentOnlineStatusResponse>;

    return customScriptsResponse.data?.resources;
  }

  async getCustomScripts(agentIds: string[]): Promise<CustomScriptsRecords> {
    try {
      const customScripts = await this.getCustomScriptsFromConnectorAction(agentIds);

      return customScripts;
    } catch (err) {
      const error = new CustomScriptsClientError(
        `Failed to fetch crowdstrike agent status for agentIds: [${agentIds}], failed with: ${err.message}`,
        500,
        err
      );
      this.log.error(error);
      throw error;
    }
  }
}
