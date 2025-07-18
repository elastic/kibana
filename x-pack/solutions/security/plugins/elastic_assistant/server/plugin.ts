/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreStart,
  Plugin,
  Logger,
  FeatureFlagsStart,
} from '@kbn/core/server';

import {
  ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG,
  ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
  ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG,
  AssistantFeatures,
} from '@kbn/elastic-assistant-common';
import { ReplaySubject, type Subject, exhaustMap, takeWhile, takeUntil } from 'rxjs';
import { ECS_COMPONENT_TEMPLATE_NAME } from '@kbn/alerting-plugin/server';
import { Dataset, IRuleDataClient, IndexOptions } from '@kbn/rule-registry-plugin/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
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
import { appContextService } from './services/app_context';
import { removeLegacyQuickPrompt } from './ai_assistant_service/helpers';
import { getAttackDiscoveryScheduleType } from './lib/attack_discovery/schedules/register_schedule/definition';
import type { ConfigSchema } from './config_schema';
import { attackDiscoveryAlertFieldMap } from './lib/attack_discovery/schedules/fields';
import { ATTACK_DISCOVERY_ALERTS_CONTEXT } from './lib/attack_discovery/schedules/constants';

interface FeatureFlagDefinition {
  featureFlagName: string;
  fallbackValue: boolean;
  /**
   * Function to execute when the feature flag is evaluated.
   * @param enabled If the feature flag is enabled or not.
   * @return `true` if susbscription needs to stay active, `false` if it can be unsubscribed.
   */
  fn: (enabled: boolean) => boolean | Promise<boolean>;
}

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
  private readonly config: ConfigSchema;

  constructor(initializerContext: PluginInitializerContext) {
    this.pluginStop$ = new ReplaySubject(1);
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
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
    const featureFlagDefinitions: FeatureFlagDefinition[] = [
      {
        featureFlagName: ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG,
        fallbackValue: false,
        fn: (assistantAttackDiscoverySchedulingEnabled) => {
          if (assistantAttackDiscoverySchedulingEnabled) {
            // Register Attack Discovery Schedule type
            plugins.alerting.registerType(
              getAttackDiscoveryScheduleType({
                logger: this.logger,
                publicBaseUrl: core.http.basePath.publicBaseUrl,
                telemetry: core.analytics,
              })
            );
          }
          return !assistantAttackDiscoverySchedulingEnabled; // keep subscription active while the feature flag is disabled
        },
      },
      {
        featureFlagName: ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG,
        fallbackValue: false,
        fn: (attackDiscoveryAlertsEnabled) => {
          let adhocAttackDiscoveryDataClient: IRuleDataClient | undefined;
          if (attackDiscoveryAlertsEnabled) {
            // Initialize index for ad-hoc generated attack discoveries
            const { ruleDataService } = plugins.ruleRegistry;

            const ruleDataServiceOptions: IndexOptions = {
              feature: ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
              registrationContext: ATTACK_DISCOVERY_ALERTS_CONTEXT,
              dataset: Dataset.alerts,
              additionalPrefix: '.adhoc',
              componentTemplateRefs: [ECS_COMPONENT_TEMPLATE_NAME],
              componentTemplates: [
                {
                  name: 'mappings',
                  mappings: mappingFromFieldMap(attackDiscoveryAlertFieldMap),
                },
              ],
            };
            adhocAttackDiscoveryDataClient =
              ruleDataService.initializeIndex(ruleDataServiceOptions);
          }
          requestContextFactory.setup(adhocAttackDiscoveryDataClient);
          return !attackDiscoveryAlertsEnabled; // keep subscription active while the feature flag is disabled.
        },
      },
    ];

    core
      .getStartServices()
      .then(([{ featureFlags }]) => this.evaluateFeatureFlags(featureFlagDefinitions, featureFlags))
      .catch((error) => {
        this.logger.error(`error in security assistant plugin setup: ${error}`);
      });

    return {
      actions: plugins.actions,
      getRegisteredFeatures: (pluginName: string) => {
        return appContextService.getRegisteredFeatures(pluginName);
      },
      getRegisteredTools: (pluginName: string | string[]) => {
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
      getRegisteredTools: (pluginName: string | string[]) => {
        return appContextService.getRegisteredTools(pluginName);
      },
      registerFeatures: (pluginName: string, features: Partial<AssistantFeatures>) => {
        return appContextService.registerFeatures(pluginName, features);
      },
      registerTools: (pluginName: string, tools: AssistantTool[]) => {
        return appContextService.registerTools(pluginName, tools);
      },
    };
  }

  public stop() {
    appContextService.stop();
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }

  private evaluateFeatureFlags(
    featureFlagDefinitions: FeatureFlagDefinition[],
    featureFlags: FeatureFlagsStart
  ) {
    featureFlagDefinitions.forEach(({ featureFlagName, fallbackValue, fn }) => {
      featureFlags
        .getBooleanValue$(featureFlagName, fallbackValue)
        .pipe(
          takeUntil(this.pluginStop$),
          exhaustMap(async (enabled) => {
            let continueSubscription = true;
            try {
              continueSubscription = await fn(enabled);
            } catch (error) {
              this.logger.error(
                `Error during setup based on feature flag ${featureFlagName}: ${error}`
              );
            }
            return continueSubscription;
          }),
          takeWhile((continueSubscription) => continueSubscription)
        )
        .subscribe();
    });
  }
}
