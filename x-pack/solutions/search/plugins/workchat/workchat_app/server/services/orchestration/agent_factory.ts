/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createAgent, type Agent } from './agent';

interface OrchestrationServiceOptions {
  logger: Logger;
  inference: InferenceServerStart;
}

export class AgentFactory {
  private readonly inference: InferenceServerStart;
  private readonly logger: Logger;

  constructor({ inference, logger }: OrchestrationServiceOptions) {
    this.inference = inference;
    this.logger = logger;
  }

  async getAgent({
    request,
    connectorId,
    agentId,
  }: {
    agentId: string;
    request: KibanaRequest;
    connectorId: string;
  }): Promise<Agent> {
    this.logger.debug(`getAgent [agentId=${agentId}] [cnnectorId=${connectorId}]`);

    const chatModel = await this.inference.getChatModel({
      request,
      connectorId,
      chatModelOptions: {},
    });
    return await createAgent({ agentId, chatModel });
  }
}
