/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { TELEMETRY_SIEM_MIGRATION_ID } from './constants';
import type { SiemMigrationsClientDependencies } from '../../types';

/** Using the inference chat model class, which extends from LangChain's `BaseChatModel` */
export type ChatModel = InferenceChatModel;

interface CreateModelParams {
  migrationId: string;
  migrationType: string;
  connectorId: string;
  abortController: AbortController;
}

export class ActionsClientChat {
  constructor(
    private readonly request: KibanaRequest,
    private readonly dependencies: SiemMigrationsClientDependencies
  ) {}

  public async createModel({
    migrationId,
    migrationType,
    connectorId,
    abortController,
  }: CreateModelParams): Promise<ChatModel> {
    const { inferenceService } = this.dependencies;

    return inferenceService.getChatModel({
      request: this.request,
      connectorId,
      chatModelOptions: {
        // not passing specific `model`, we'll always use the connector default model
        // temperature may need to be parametrized in the future
        temperature: 0.05,
        // Only retry once inside the model call, we already handle backoff retries in the task runner for the entire task
        maxRetries: 1,
        // Disable streaming explicitly
        disableStreaming: true,
        // Set a hard limit of 50 concurrent requests
        maxConcurrency: 50,
        telemetryMetadata: {
          pluginId: `${TELEMETRY_SIEM_MIGRATION_ID}_${migrationType}`,
          aggregateBy: migrationId,
        },
        signal: abortController.signal,
      },
    });
  }

  public getModelName(model: ChatModel): string | undefined {
    return model.identifyingParams().model_name;
  }
}
