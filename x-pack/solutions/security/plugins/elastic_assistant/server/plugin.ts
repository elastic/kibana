/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';

import {
  ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG,
  AssistantFeatures,
} from '@kbn/elastic-assistant-common';
import { ReplaySubject, type Subject } from 'rxjs';
import { BuildFlavor } from '@kbn/config';
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
import { createEventLogger } from './create_event_logger';
import { PLUGIN_ID } from '../common/constants';
import { registerEventLogProvider } from './register_event_log_provider';
import { registerRoutes } from './routes/register_routes';
import { CallbackIds, appContextService } from './services/app_context';
import { removeLegacyQuickPrompt } from './ai_assistant_service/helpers';
import { getAttackDiscoveryScheduleType } from './lib/attack_discovery/schedules/register_schedule/definition';
import type { ConfigSchema } from './config_schema';

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
  private readonly buildFlavor: BuildFlavor;
  private readonly config: ConfigSchema;

  constructor(initializerContext: PluginInitializerContext) {
    this.pluginStop$ = new ReplaySubject(1);
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.buildFlavor = initializerContext.env.packageInfo.buildFlavor;
    this.config = initializerContext.config.get<ConfigSchema>();
  }

  public setup(
    core: ElasticAssistantPluginCoreSetupDependencies,
    plugins: ElasticAssistantPluginSetupDependencies
  ) {
    this.logger.debug('elasticAssistant: Setup');

    registerEventLogProvider(plugins.eventLog);
    const eventLogger = createEventLogger(plugins.eventLog); // must be created during setup phase

    this.assistantService = new AIAssistantService({
      logger: this.logger.get('service'),
      ml: plugins.ml,
      taskManager: plugins.taskManager,
      kibanaVersion: this.kibanaVersion,
      elserInferenceId: this.config.elserInferenceId,
      elasticsearchClientPromise: core
        .getStartServices()
        .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
      soClientPromise: core
        .getStartServices()
        .then(([{ savedObjects }]) => savedObjects.createInternalRepository()),
      productDocManager: core
        .getStartServices()
        .then(([_, { productDocBase }]) => productDocBase.management),
      pluginStop$: this.pluginStop$,
      savedAttackDiscoveries: true,
    });

    const requestContextFactory = new RequestContextFactory({
      logger: this.logger,
      core,
      plugins,
      kibanaVersion: this.kibanaVersion,
      buildFlavor: this.buildFlavor,
      assistantService: this.assistantService,
    });

    const router = core.http.createRouter<ElasticAssistantRequestHandlerContext>();
    core.http.registerRouteHandlerContext<ElasticAssistantRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      (context, request) =>
        requestContextFactory.create(
          context,
          request,
          plugins.eventLog.getIndexPattern(),
          eventLogger
        )
    );
    events.forEach((eventConfig) => core.analytics.registerEventType(eventConfig));

    registerRoutes(router, this.logger, this.config);

    // The featureFlags service is not available in the core setup, so we need
    // to wait for the start services to be available to read the feature flags.
    // This can take a while, but the plugin setup phase cannot run for a long time.
    // As a workaround, this promise does not block the setup phase.
    core
      .getStartServices()
      .then(([{ featureFlags }]) => {
        // read all feature flags:
        void Promise.all([
          featureFlags.getBooleanValue(ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG, false),
          // add more feature flags here
        ]).then(([assistantAttackDiscoverySchedulingEnabled]) => {
          if (assistantAttackDiscoverySchedulingEnabled) {
            // Register Attack Discovery Schedule type
            plugins.alerting.registerType(
              getAttackDiscoveryScheduleType({
                logger: this.logger,
              })
            );
          }
        });
      })
      .catch((error) => {
        this.logger.error(`error in security assistant plugin setup: ${error}`);
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
