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
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type {
  ElasticAssistantApiRequestHandlerContext,
  ElasticAssistantPluginCoreSetupDependencies,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantRequestHandlerContext,
} from '../types';
import type { AIAssistantService } from '../ai_assistant_service';
import { appContextService } from '../services/app_context';

let hasLoggedProfileUidError = false;

export interface IRequestContextFactory {
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
  adhocAttackDiscoveryDataClient: IRuleDataClient;
}

export class RequestContextFactory implements IRequestContextFactory {
  private readonly logger: Logger;
  private readonly assistantService: AIAssistantService;
  private adhocAttackDiscoveryDataClient: IRuleDataClient;

  constructor(private readonly options: ConstructorOptions) {
    this.logger = options.logger;
    this.assistantService = options.assistantService;
    this.adhocAttackDiscoveryDataClient = options.adhocAttackDiscoveryDataClient;
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
        // In some serverless/versioned Elasticsearch environments, `with_profile_uid` is unsupported,
        // and API-key authenticated users may not have roles/username in the same way as realm users.
        // Use stable fallbacks to avoid hard failures and noisy logs.
        if (contextUser.authentication_type === 'api_key' && contextUser.api_key?.id) {
          return { ...contextUser, profile_uid: contextUser.api_key.id };
        }

        try {
          const users = await coreContext.elasticsearch.client.asCurrentUser.security.getUser({
            username: contextUser.username,
            with_profile_uid: true,
          });

          if (users[contextUser.username].profile_uid) {
            contextUser = { ...contextUser, profile_uid: users[contextUser.username].profile_uid };
          }
        } catch (e) {
          if (!hasLoggedProfileUidError) {
            hasLoggedProfileUidError = true;
            this.logger.warn(
              `Failed to get user profile_uid; continuing without it. This can occur on some Elasticsearch versions/serverless deployments. ${e}`
            );
          }
        }

        if (contextUser && !contextUser.profile_uid && contextUser.username) {
          contextUser = { ...contextUser, profile_uid: contextUser.username };
        }
      }

      return contextUser;
    };

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);
    const actionsClient = await startPlugins.actions.getActionsClientWithRequest(request);
    return {
      core: coreContext,
      userProfile: coreStart.userProfile,
      actions: startPlugins.actions,
      rulesClient,
      frameworkAlerts: plugins.alerting.frameworkAlerts,
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
      /**
       * Test purpose only.
       */
      updateAnonymizationFields: async () => {
        return this.assistantService.createDefaultAnonymizationFields(getSpaceId());
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
          assistantInterruptsEnabled: params?.assistantInterruptsEnabled,
        });
      }),

      getCheckpointSaver: memoize(async () => {
        if (!this.assistantService.getIsCheckpointSaverEnabled()) {
          return null;
        }
        const currentUser = await getCurrentUser();
        return this.assistantService.createCheckpointSaver({
          spaceId: getSpaceId(),
          licensing: context.licensing,
          logger: this.logger,
          currentUser,
        });
      }),
    };
  }
}
