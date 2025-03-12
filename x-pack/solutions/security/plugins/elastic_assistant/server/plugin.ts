/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { AssistantFeatures } from '@kbn/elastic-assistant-common';
import { ReplaySubject, type Subject } from 'rxjs';
import { MlPluginSetup } from '@kbn/ml-plugin/server';
import { RunContext } from '@kbn/task-manager-plugin/server';
import { events } from './lib/telemetry/event_based_telemetry';
import {
  AssistantTool,
  ElasticAssistantPluginCoreSetupDependencies,
  ElasticAssistantPluginSetup,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantPluginStart,
  ElasticAssistantPluginStartDependencies,
  ElasticAssistantRequestHandlerContext,
} from './types';
import { AIAssistantService } from './ai_assistant_service';
import { RequestContextFactory } from './routes/request_context_factory';
import { PLUGIN_ID } from '../common/constants';
import { registerRoutes } from './routes/register_routes';
import { CallbackIds, appContextService } from './services/app_context';
import { createGetElserId, removeLegacyQuickPrompt } from './ai_assistant_service/helpers';
import { getAttackDiscoveryAlertingRule } from './lib/attack_discovery/schedules/alerting_rule';

export class ElasticAssistantPlugin
  implements
    Plugin<
      ElasticAssistantPluginSetup,
      ElasticAssistantPluginStart,
      ElasticAssistantPluginSetupDependencies,
      ElasticAssistantPluginStartDependencies
    >
{
  private readonly logger: Logger;
  private assistantService: AIAssistantService | undefined;
  private pluginStop$: Subject<void>;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private mlTrainedModelsProvider?: MlPluginSetup['trainedModelsProvider'];
  private getElserId?: () => Promise<string>;

  constructor(initializerContext: PluginInitializerContext) {
    this.pluginStop$ = new ReplaySubject(1);
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(
    core: ElasticAssistantPluginCoreSetupDependencies,
    plugins: ElasticAssistantPluginSetupDependencies
  ) {
    this.logger.debug('elasticAssistant: Setup');

    this.assistantService = new AIAssistantService({
      logger: this.logger.get('service'),
      ml: plugins.ml,
      taskManager: plugins.taskManager,
      kibanaVersion: this.kibanaVersion,
      elasticsearchClientPromise: core
        .getStartServices()
        .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
      productDocManager: core
        .getStartServices()
        .then(([_, { productDocBase }]) => productDocBase.management),
      pluginStop$: this.pluginStop$,
    });

    const requestContextFactory = new RequestContextFactory({
      logger: this.logger,
      core,
      plugins,
      kibanaVersion: this.kibanaVersion,
      assistantService: this.assistantService,
    });

    const router = core.http.createRouter<ElasticAssistantRequestHandlerContext>();
    core.http.registerRouteHandlerContext<ElasticAssistantRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      (context, request) => requestContextFactory.create(context, request)
    );
    events.forEach((eventConfig) => core.analytics.registerEventType(eventConfig));

    this.mlTrainedModelsProvider = plugins.ml.trainedModelsProvider;
    this.getElserId = createGetElserId(this.mlTrainedModelsProvider);

    registerRoutes(router, this.logger, this.getElserId);

    // Register Attack Discovery schedule rule type
    plugins.alerting.registerType(
      getAttackDiscoveryAlertingRule({
        logger: this.logger,
        telemetry: core.analytics,
        kibanaVersion: this.kibanaVersion,
      })
    );

    plugins.taskManager.registerTaskDefinitions({
      attack_discovery_scheduling: {
        title: 'rule_id_1',
        description: 'Scheduled attack discovery generation',

        /**
         * Creates an object that has a run function which performs the task's work,
         * and an optional cancel function which cancels the task.
         */
        createTaskRunner: (context: RunContext) => {
          return {
            async run() {
              const params = context.taskInstance.params;
              return undefined;
            },
          };
        },
      },
    });

    return {
      actions: plugins.actions,
      getRegisteredFeatures: (pluginName: string) => {
        return appContextService.getRegisteredFeatures(pluginName);
      },
      getRegisteredTools: (pluginName: string) => {
        return appContextService.getRegisteredTools(pluginName);
      },
    };
  }

  public start(
    core: CoreStart,
    plugins: ElasticAssistantPluginStartDependencies
  ): ElasticAssistantPluginStart {
    this.logger.debug('elasticAssistant: Started');
    appContextService.start({ logger: this.logger });

    plugins.licensing.license$.subscribe(() => {
      if (this.mlTrainedModelsProvider) {
        this.getElserId = createGetElserId(this.mlTrainedModelsProvider);
      }
    });
    removeLegacyQuickPrompt(core.elasticsearch.client.asInternalUser)
      .then((res) => {
        if (res?.total)
          this.logger.info(`Removed ${res.total} legacy quick prompts from AI Assistant`);
      })
      .catch(() => {});

    return {
      actions: plugins.actions,
      inference: plugins.inference,
      getRegisteredFeatures: (pluginName: string) => {
        return appContextService.getRegisteredFeatures(pluginName);
      },
      getRegisteredTools: (pluginName: string) => {
        return appContextService.getRegisteredTools(pluginName);
      },
      registerFeatures: (pluginName: string, features: Partial<AssistantFeatures>) => {
        return appContextService.registerFeatures(pluginName, features);
      },
      registerTools: (pluginName: string, tools: AssistantTool[]) => {
        return appContextService.registerTools(pluginName, tools);
      },
      registerCallback: (callbackId: CallbackIds, callback: Function) => {
        return appContextService.registerCallback(callbackId, callback);
      },
    };
  }

  public stop() {
    appContextService.stop();
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
