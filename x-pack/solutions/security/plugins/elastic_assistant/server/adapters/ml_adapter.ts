/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type {
  KibanaRequestInterface,
  MlPluginSetupInterface,
  SavedObjectsClientInterface,
  TrainedModelsProviderInterface,
} from '@kbn/elastic-assistant-ml-interfaces/server';

/**
 * Adapter for the ML plugin that implements the MlPluginSetupInterface from our interface package
 * This allows us to bridge between the actual ML plugin and our interface, preventing circular dependencies
 */
export class MlAdapter implements MlPluginSetupInterface {
  constructor(
    private readonly mlPlugin: MlPluginSetup | undefined,
    private readonly logger: Logger
  ) {}

  /**
   * Provide access to trained models functionality
   * This implements the interface from our interface package but delegates to the actual ML plugin
   */
  public trainedModelsProvider = (
    request: KibanaRequestInterface,
    savedObjectsClient: SavedObjectsClientInterface
  ): TrainedModelsProviderInterface => {
    if (!this.mlPlugin) {
      this.logger.warn('ML plugin is not available, some functionality may be limited');
      return this.createFallbackTrainedModelsProvider();
    }

    // Delegate to the actual ML plugin
    const actualProvider = this.mlPlugin.trainedModelsProvider(request, savedObjectsClient);

    // Return a provider that implements our interface
    return {
      getTrainedModel: async (modelId: string) => {
        return actualProvider.getTrainedModel(modelId);
      },
      getTrainedModelDeploymentStats: async (modelId: string) => {
        return actualProvider.getTrainedModelDeploymentStats(modelId);
      },
      trainedModelExists: async (modelId: string) => {
        return actualProvider.trainedModelExists(modelId);
      },
      isTrainedModelDeployed: async (modelId: string) => {
        return actualProvider.isTrainedModelDeployed(modelId);
      },
      startDeployment: async (
        modelId: string,
        deploymentId?: string,
        priority?: string,
        queueCapacity?: number,
        threadsPerAllocation?: number,
        numberOfAllocations?: number
      ) => {
        return actualProvider.startDeployment(
          modelId,
          deploymentId,
          priority,
          queueCapacity,
          threadsPerAllocation,
          numberOfAllocations
        );
      },
      stopDeployment: async (modelId: string) => {
        return actualProvider.stopDeployment(modelId);
      },
    };
  };

  /**
   * Create a fallback trained models provider when the ML plugin is not available
   * This allows the application to start but with limited functionality
   */
  private createFallbackTrainedModelsProvider(): TrainedModelsProviderInterface {
    return {
      getTrainedModel: async () => {
        throw new Error('ML plugin is not available');
      },
      getTrainedModelDeploymentStats: async () => {
        throw new Error('ML plugin is not available');
      },
      trainedModelExists: async () => false,
      isTrainedModelDeployed: async () => false,
      startDeployment: async () => {
        throw new Error('ML plugin is not available');
      },
      stopDeployment: async () => {
        throw new Error('ML plugin is not available');
      },
    };
  }

  /**
   * Important note about circular dependencies:
   * We've completely removed the discover->elasticAssistant->ml->discover circular dependency
   * by removing the direct reference from ML to discover. ML now has no dependency on discover.
   *
   * This adapter ensures elasticAssistant can still work with ML functionality
   * even though the direct dependency chain has been broken.
   */
}
