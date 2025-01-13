/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import { DefaultRouteHandlerResources, registerRoutes } from '@kbn/server-route-repository';
import { getObservabilityOnboardingServerRouteRepository } from './routes';
import { ObservabilityOnboardingRouteHandlerResources } from './routes/types';
import {
  ObservabilityOnboardingPluginSetup,
  ObservabilityOnboardingPluginSetupDependencies,
  ObservabilityOnboardingPluginStart,
  ObservabilityOnboardingPluginStartDependencies,
} from './types';
import { observabilityOnboardingFlow } from './saved_objects/observability_onboarding_status';
import { EsLegacyConfigService } from './services/es_legacy_config_service';
import { ObservabilityOnboardingConfig } from './config';

export class ObservabilityOnboardingPlugin
  implements
    Plugin<
      ObservabilityOnboardingPluginSetup,
      ObservabilityOnboardingPluginStart,
      ObservabilityOnboardingPluginSetupDependencies,
      ObservabilityOnboardingPluginStartDependencies
    >
{
  private readonly logger: Logger;
  esLegacyConfigService = new EsLegacyConfigService();

  constructor(
    private readonly initContext: PluginInitializerContext<ObservabilityOnboardingConfig>
  ) {
    this.initContext = initContext;
    this.logger = this.initContext.logger.get();
  }

  public setup(
    core: CoreSetup<
      ObservabilityOnboardingPluginStartDependencies,
      ObservabilityOnboardingPluginStart
    >,
    plugins: ObservabilityOnboardingPluginSetupDependencies
  ) {
    this.esLegacyConfigService.setup(core.elasticsearch.legacy.config$);

    core.savedObjects.registerType(observabilityOnboardingFlow);

    const resourcePlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[
              key as keyof ObservabilityOnboardingPluginStartDependencies
            ];
          }),
      };
    }) as ObservabilityOnboardingRouteHandlerResources['plugins'];

    const config = this.initContext.config.get<ObservabilityOnboardingConfig>();

    const dependencies: Omit<
      ObservabilityOnboardingRouteHandlerResources,
      keyof DefaultRouteHandlerResources
    > = {
      config,
      kibanaVersion: this.initContext.env.packageInfo.version,
      plugins: resourcePlugins,
      services: {
        esLegacyConfigService: this.esLegacyConfigService,
      },
      core: {
        setup: core,
        start: () => core.getStartServices().then(([coreStart]) => coreStart),
      },
    };

    registerRoutes({
      core,
      logger: this.logger,
      repository: getObservabilityOnboardingServerRouteRepository(),
      dependencies,
    });

    plugins.customIntegrations.registerCustomIntegration({
      id: 'otel',
      title: i18n.translate('xpack.observability_onboarding.otelTile.title', {
        defaultMessage: 'OpenTelemetry',
      }),
      categories: ['observability'],
      uiInternalPath: '/app/observabilityOnboarding/otel-logs',
      description: i18n.translate('xpack.observability_onboarding.otelTile.description', {
        defaultMessage:
          'Collect logs and host metrics using the Elastic distribution of the OpenTelemetry Collector',
      }),
      icons: [
        {
          type: 'svg',
          src: core.http.staticAssets.getPluginAssetHref('opentelemetry.svg') ?? '',
        },
      ],
      shipper: 'tutorial',
      isBeta: true,
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {
    this.esLegacyConfigService.stop();
  }
}
