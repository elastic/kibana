/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import type { ChatClient, KibanaClient } from '../kibana_client';

function createErrorThrowingProxy(name: string): any {
  return new Proxy(
    {},
    {
      get: () => {
        throw new Error(`${name} has not been instantiated yet`);
      },
      set: () => {
        throw new Error(`${name} has not been instantiated yet`);
      },
    }
  );
}

export let chatClient: ChatClient = createErrorThrowingProxy('ChatClient');
export let esClient: Client = createErrorThrowingProxy('esClient');
export let kibanaClient: KibanaClient = createErrorThrowingProxy('kibanaClient');
export let logger: ToolingLog = createErrorThrowingProxy('logger');
export let selectedConnector: any = createErrorThrowingProxy('selectedConnector');

export const initServices = (services: {
  chatClient: ChatClient;
  esClient: Client;
  kibanaClient: KibanaClient;
  logger: ToolingLog;
  selectedConnector: any;
}) => {
  chatClient = services.chatClient;
  esClient = services.esClient;
  kibanaClient = services.kibanaClient;
  logger = services.logger;
  selectedConnector = services.selectedConnector;
};
