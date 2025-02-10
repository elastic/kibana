/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';

import type { Logger, KibanaRequest, RequestHandlerContext } from '@kbn/core/server';

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import {
  ElasticAssistantApiRequestHandlerContext,
  ElasticAssistantPluginCoreSetupDependencies,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantRequestHandlerContext,
} from '../types';
import { AIAssistantService } from '../ai_assistant_service';
import { appContextService } from '../services/app_context';

export interface IRequestContextFactory {
  create(
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<ElasticAssistantApiRequestHandlerContext>;
}

interface ConstructorOptions {
  logger: Logger;
  core: ElasticAssistantPluginCoreSetupDependencies;
  plugins: ElasticAssistantPluginSetupDependencies;
  kibanaVersion: string;
  assistantService: AIAssistantService;
}

export class RequestContextFactory implements IRequestContextFactory {
  private readonly logger: Logger;
  private readonly assistantService: AIAssistantService;

  constructor(private readonly options: ConstructorOptions) {
    this.logger = options.logger;
    this.assistantService = options.assistantService;
  }

  public async create(
    context: Omit<ElasticAssistantRequestHandlerContext, 'elasticAssistant'>,
    request: KibanaRequest
  ): Promise<ElasticAssistantApiRequestHandlerContext> {
    const { options } = this;
    const { core } = options;

    const [coreStart, startPlugins] = await core.getStartServices();
    const coreContext = await context.core;

    const getSpaceId = (): string =>
      startPlugins.spaces?.spacesService?.getSpaceId(request) || DEFAULT_NAMESPACE_STRING;

    const getCurrentUser = () => coreContext.security.authc.getCurrentUser();

    return {
      core: coreContext,

      actions: startPlugins.actions,
      auditLogger: coreStart.security.audit?.asScoped(request),
      logger: this.logger,

      getServerBasePath: () => core.http.basePath.serverBasePath,

      getSpaceId,

      getCurrentUser,

      getRegisteredTools: (pluginName: string) => {
        return appContextService.getRegisteredTools(pluginName);
      },

      getRegisteredFeatures: (pluginName: string) => {
        return appContextService.getRegisteredFeatures(pluginName);
      },
      llmTasks: startPlugins.llmTasks,
      inference: startPlugins.inference,
      savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
      telemetry: core.analytics,

      // Note: modelIdOverride is used here to enable setting up the KB using a different ELSER model, which
      // is necessary for testing purposes (`pt_tiny_elser`).
      getAIAssistantKnowledgeBaseDataClient: memoize(async (params) => {
        const currentUser = getCurrentUser();

        const { securitySolutionAssistant } = await coreStart.capabilities.resolveCapabilities(
          request,
          {
            capabilityPath: 'securitySolutionAssistant.*',
          }
        );
        return this.assistantService.createAIAssistantKnowledgeBaseDataClient({
          spaceId: getSpaceId(),
          logger: this.logger,
          licensing: context.licensing,
          currentUser,
          modelIdOverride: params?.modelIdOverride,
          manageGlobalKnowledgeBaseAIAssistant:
            securitySolutionAssistant.manageGlobalKnowledgeBaseAIAssistant as boolean,
        });
      }),

      getAttackDiscoveryDataClient: memoize(() => {
        const currentUser = getCurrentUser();
        return this.assistantService.createAttackDiscoveryDataClient({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
        });
      }),

      getDefendInsightsDataClient: memoize(() => {
        const currentUser = getCurrentUser();
        return this.assistantService.createDefendInsightsDataClient({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
        });
      }),

      getAIAssistantPromptsDataClient: memoize(() => {
        const currentUser = getCurrentUser();
        return this.assistantService.createAIAssistantPromptsDataClient({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
        });
      }),

      getAIAssistantAnonymizationFieldsDataClient: memoize(() => {
        const currentUser = getCurrentUser();
        return this.assistantService.createAIAssistantAnonymizationFieldsDataClient({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
        });
      }),

      getAIAssistantConversationsDataClient: memoize(async (params) => {
        const currentUser = getCurrentUser();
        return this.assistantService.createAIAssistantConversationsDataClient({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
          contentReferencesEnabled: params?.contentReferencesEnabled,
        });
      }),
    };
  }
}
