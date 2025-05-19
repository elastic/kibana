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
import type { CrowdstrikeGetScriptsResponse } from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { CustomScriptsClientError } from '../lib/errors';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { NormalizedExternalConnectorClient } from '../../..';
import { CustomScriptsClient } from '../lib/base_custom_scripts_client';

export class CrowdstrikeCustomScriptsClient extends CustomScriptsClient {
  protected readonly agentType: ResponseActionAgentType = 'crowdstrike';

  private async getCustomScriptsFromConnectorAction() {
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
    })) as ActionTypeExecutorResult<CrowdstrikeGetScriptsResponse>;

    return customScriptsResponse.data?.resources;
  }

  async getCustomScripts(): Promise<CustomScriptsRecords> {
    try {
      return this.getCustomScriptsFromConnectorAction();
    } catch (err) {
      const error = new CustomScriptsClientError(
        `Failed to fetch crowdstrike agent status, failed with: ${err.message}`,
        500,
        err
      );
      this.log.error(error);
      throw error;
    }
  }
}
