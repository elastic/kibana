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
import { CustomScriptsNotSupportedError } from './errors';
import type { CustomScriptsResponse } from '../../../../../../common/endpoint/types/custom_scripts';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { EndpointAppContextService } from '../../../../endpoint_app_context_services';
import type { CustomScriptsClientInterface } from './types';

/**
 * Options for creating a custom scripts client
 */
export interface CustomScriptsClientOptions {
  endpointService: EndpointAppContextService;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  connectorActionsClient?: ActionsClient;
}

/**
 * Base class for all custom scripts clients
 * Provides common functionality and enforces the interface
 */
export abstract class CustomScriptsClient implements CustomScriptsClientInterface {
  protected readonly log: Logger;
  protected abstract readonly agentType: ResponseActionAgentType;

  constructor(protected readonly options: CustomScriptsClientOptions) {
    this.log = options.endpointService.createLogger(this.constructor.name ?? 'CustomScriptsClient');
  }

  /**
   * Default implementation that throws an error
   * Provider-specific implementations should override this method
   */
  public async getCustomScripts(): Promise<CustomScriptsResponse> {
    throw new CustomScriptsNotSupportedError(this.agentType);
  }
}
