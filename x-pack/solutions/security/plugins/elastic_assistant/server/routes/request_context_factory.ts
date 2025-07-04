/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';

import type { Logger, KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import {
  ElasticAssistantApiRequestHandlerContext,
  ElasticAssistantPluginCoreSetupDependencies,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantRequestHandlerContext,
} from '../types';
import { AIAssistantService } from '../ai_assistant_service';
import { appContextService } from '../services/app_context';

export interface IRequestContextFactory {
  setup(adhocAttackDiscoveryDataClient: IRuleDataClient | undefined): void;
  create(
    context: RequestHandlerContext,
    request: KibanaRequest,
    eventLogIndex: string,
    eventLogger: IEventLogger
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
  private adhocAttackDiscoveryDataClient: IRuleDataClient | undefined;

  constructor(private readonly options: ConstructorOptions) {
    this.logger = options.logger;
    this.assistantService = options.assistantService;
  }

  public setup(adhocAttackDiscoveryDataClient: IRuleDataClient | undefined) {
    this.adhocAttackDiscoveryDataClient = adhocAttackDiscoveryDataClient;
  }

  public async create(
    context: Omit<ElasticAssistantRequestHandlerContext, 'elasticAssistant'>,
    request: KibanaRequest,
    eventLogIndex: string,
    eventLogger: IEventLogger
  ): Promise<ElasticAssistantApiRequestHandlerContext> {
    const { options } = this;
    const { core, plugins } = options;

    const [coreStart, startPlugins] = await core.getStartServices();
    const coreContext = await context.core;

    const getSpaceId = (): string =>
      startPlugins.spaces?.spacesService?.getSpaceId(request) || DEFAULT_NAMESPACE_STRING;

    const getCurrentUser = async () => {
      let contextUser = coreContext.security.authc.getCurrentUser();

      if (contextUser && !contextUser?.profile_uid) {
        try {
          const users = await coreContext.elasticsearch.client.asCurrentUser.security.getUser({
            username: contextUser.username,
            with_profile_uid: true,
          });

          if (users[contextUser.username].profile_uid) {
            contextUser = { ...contextUser, profile_uid: users[contextUser.username].profile_uid };
          }
        } catch (e) {
          this.logger.error(`Failed to get user profile_uid: ${e}`);
        }
      }

      return contextUser;
    };

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
    const actionsClient = await startPlugins.actions.getActionsClientWithRequest(request);

    return {
      core: coreContext,

      actions: startPlugins.actions,
      auditLogger: coreStart.security.audit?.asScoped(request),
      logger: this.logger,
      eventLogIndex,
      /** for writing to the event log */
      eventLogger,
      getServerBasePath: () => core.http.basePath.serverBasePath,

      getSpaceId,

      getCurrentUser,

      getRegisteredTools: (pluginName: string | string[]) => {
        return appContextService.getRegisteredTools(pluginName);
      },

      getRegisteredFeatures: (pluginName: string) => {
        return appContextService.getRegisteredFeatures(pluginName);
      },

      checkPrivileges: () => {
        return startPlugins.security.authz.checkPrivilegesWithRequest(request);
      },
      llmTasks: startPlugins.llmTasks,
      inference: startPlugins.inference,
      savedObjectsClient,
      telemetry: core.analytics,

      // Note: elserInferenceId is used here to enable setting up the KB using a different ELSER model, which
      // is necessary for testing purposes (`pt_tiny_elser`).
      getAIAssistantKnowledgeBaseDataClient: memoize(async (params) => {
        const currentUser = await getCurrentUser();

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
          elserInferenceId: params?.elserInferenceId,
          manageGlobalKnowledgeBaseAIAssistant:
            securitySolutionAssistant.manageGlobalKnowledgeBaseAIAssistant as boolean,
          // uses internal user to interact with ML API
          getTrainedModelsProvider: () =>
            plugins.ml.trainedModelsProvider(
              {} as KibanaRequest,
              coreStart.savedObjects.createInternalRepository()
            ),
        });
      }),

      getAttackDiscoveryDataClient: memoize(async () => {
        const currentUser = await getCurrentUser();
        return this.assistantService.createAttackDiscoveryDataClient({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
          adhocAttackDiscoveryDataClient: this.adhocAttackDiscoveryDataClient,
        });
      }),

      getAttackDiscoverySchedulingDataClient: memoize(async () => {
        return this.assistantService.createAttackDiscoverySchedulingDataClient({
          actionsClient,
          logger: this.logger,
          rulesClient,
        });
      }),

      getDefendInsightsDataClient: memoize(async () => {
        const currentUser = await getCurrentUser();
        return this.assistantService.createDefendInsightsDataClient({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
        });
      }),

      getAIAssistantPromptsDataClient: memoize(async () => {
        const currentUser = await getCurrentUser();
        return this.assistantService.createAIAssistantPromptsDataClient({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
        });
      }),

      getAlertSummaryDataClient: memoize(async () => {
        const currentUser = await getCurrentUser();
        return this.assistantService.createAlertSummaryDataClient({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
        });
      }),

      getAIAssistantAnonymizationFieldsDataClient: memoize(async () => {
        const currentUser = await getCurrentUser();
        return this.assistantService.createAIAssistantAnonymizationFieldsDataClient({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
        });
      }),

      getAIAssistantConversationsDataClient: memoize(async (params) => {
        const currentUser = await getCurrentUser();
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
