/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector } from '@kbn/search-connectors';

import { HttpError, Status } from '../../../../../common/types/api';
import {
  GenerateConfigApiActions,
  GenerateConfigApiLogic,
} from '../../api/connector/generate_connector_config_api_logic';
import { APIKeyResponse } from '../../api/generate_api_key/generate_api_key_logic';

export interface DeploymentLogicValues {
  generateConfigurationError: HttpError;
  generateConfigurationStatus: Status;
  generatedData: {
    apiKey: APIKeyResponse['apiKey'];
    connectorId: Connector['id'];
    indexName: string;
  };
  isGenerateLoading: boolean;
}
export interface DeploymentLogicActions {
  generateConfiguration: GenerateConfigApiActions['makeRequest'];
  generateConfigurationSuccess: GenerateConfigApiActions['apiSuccess'];
}

export const DeploymentLogic = kea<MakeLogicType<DeploymentLogicValues, DeploymentLogicActions>>({
  connect: {
    actions: [
      GenerateConfigApiLogic,
      ['makeRequest as generateConfiguration', 'apiSuccess as generateConfigurationSuccess'],
    ],
    values: [
      GenerateConfigApiLogic,
      [
        'status as generateConfigurationStatus',
        'data as generatedData',
        'error as generateConfigurationError',
      ],
    ],
  },
  selectors: {
    isGenerateLoading: [
      (selectors) => [selectors.generateConfigurationStatus],
      (status) => status === Status.LOADING,
    ],
  },
});
