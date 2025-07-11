/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { DISCOVER_APP_LOCATOR, type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';
import {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import { SharePluginSetup } from '@kbn/share-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { PluginSetup as ESQLSetup } from '@kbn/esql/server';
import { getManageRulesFeature } from './features/observability_rules';
import { ObservabilityConfig } from '.';
import { OBSERVABILITY_TIERED_FEATURES, observabilityFeatureId } from '../common';
import {
  kubernetesGuideConfig,
  kubernetesGuideId,
} from '../common/guided_onboarding/kubernetes_guide_config';
import { AlertsLocatorDefinition } from '../common/locators/alerts';
import {
  AnnotationsAPI,
  bootstrapAnnotations,
  ScopedAnnotationsClientFactory,
} from './lib/annotations/bootstrap_annotations';
import { registerRuleTypes } from './lib/rules/register_rule_types';
import { getObservabilityServerRouteRepository } from './routes/get_global_observability_server_route_repository';
import { registerRoutes } from './routes/register_routes';
import { threshold } from './saved_objects/threshold';
import { AlertDetailsContextualInsightsService } from './services';
import { uiSettings } from './ui_settings';
import { getCasesFeature } from './features/cases_v1';
import { getCasesFeatureV2 } from './features/cases_v2';
import { getCasesFeatureV3 } from './features/cases_v3';
import { setEsqlRecommendedQueries } from './lib/esql_extensions/set_esql_recommended_queries';

export type ObservabilityPluginSetup = ReturnType<ObservabilityPlugin['setup']>;

interface PluginSetup {
  alerting: AlertingServerSetup;
  features: FeaturesPluginSetup;
  guidedOnboarding?: GuidedOnboardingPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  share: SharePluginSetup;
  spaces?: SpacesPluginSetup;
  usageCollection?: UsageCollectionSetup;
  cloud?: CloudSetup;
  contentManagement: ContentManagementServerSetup;
  esql: ESQLSetup;
}

interface PluginStart {
  alerting: AlertingServerStart;
  spaces?: SpacesPluginStart;
  dataViews: DataViewsServerPluginStart;
  ruleRegistry: RuleRegistryPluginStartContract;
  dashboard: DashboardPluginStart;
}
export class ObservabilityPlugin
  implements Plugin<ObservabilityPluginSetup, void, PluginSetup, PluginStart>
{
  private logger: Logger;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup<PluginStart, void>, plugins: PluginSetup) {
    const casesCapabilities = createCasesUICapabilities();
    const casesApiTags = getCasesApiTags(observabilityFeatureId);

    const config = this.initContext.config.get<ObservabilityConfig>();

    const alertsLocator = plugins.share.url.locators.create(new AlertsLocatorDefinition());

    const logsLocator =
      plugins.share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

    const alertDetailsContextualInsightsService = new AlertDetailsContextualInsightsService();

    plugins.features.registerKibanaFeature(getCasesFeature(casesCapabilities, casesApiTags));
    plugins.features.registerKibanaFeature(getCasesFeatureV2(casesCapabilities, casesApiTags));
    plugins.features.registerKibanaFeature(getCasesFeatureV3(casesCapabilities, casesApiTags));
    plugins.features.registerKibanaFeature(getManageRulesFeature());

    let annotationsApiPromise: Promise<AnnotationsAPI> | undefined;

    core.uiSettings.register(uiSettings);

    core.pricing.registerProductFeatures(OBSERVABILITY_TIERED_FEATURES);

    const { ruleDataService } = plugins.ruleRegistry;

    core.savedObjects.registerType(threshold);

    registerRuleTypes(plugins.alerting, core.http.basePath, config, this.logger, {
      alertsLocator,
      logsLocator,
    });

    void core.getStartServices().then(([coreStart, pluginStart]) => {
      const isCompleteOverviewEnabled = coreStart.pricing.isFeatureAvailable(
        'observability:complete_overview'
      );

      if (config.annotations.enabled && isCompleteOverviewEnabled) {
        annotationsApiPromise = bootstrapAnnotations({
          core,
          index: config.annotations.index,
          context: this.initContext,
        }).catch((err) => {
          const logger = this.initContext.logger.get('annotations');
          logger.warn(err);
          throw err;
        });
      }
      registerRoutes({
        core,
        dependencies: {
          pluginsSetup: {
            ...plugins,
            core,
          },
          dashboard: pluginStart.dashboard,
          ruleRegistry: pluginStart.ruleRegistry,
          dataViews: pluginStart.dataViews,
          spaces: pluginStart.spaces,
          ruleDataService,
          assistant: {
            alertDetailsContextualInsightsService,
          },
          getRulesClientWithRequest: pluginStart.alerting.getRulesClientWithRequest,
        },
        logger: this.logger,
        repository: getObservabilityServerRouteRepository(config),
        isDev: this.initContext.env.mode.dev,
      });
    });
    /**
     * Register a config for the observability guide
     */
    plugins.guidedOnboarding?.registerGuideConfig(kubernetesGuideId, kubernetesGuideConfig);

    setEsqlRecommendedQueries(plugins.esql);

    return {
      getAlertDetailsConfig() {
        return config.unsafe.alertDetails;
      },
      getScopedAnnotationsClient: async (...args: Parameters<ScopedAnnotationsClientFactory>) => {
        const api = await annotationsApiPromise;
        return api?.getScopedAnnotationsClient(...args);
      },
      alertDetailsContextualInsightsService,
      alertsLocator,
    };
  }

  public start(core: CoreStart, plugins: PluginStart) {}

  public stop() {}
}
