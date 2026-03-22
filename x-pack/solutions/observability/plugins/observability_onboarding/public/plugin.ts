/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import type { FleetSetup, FleetStart } from '@kbn/fleet-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import type { StreamsPluginStart } from '@kbn/streams-plugin/public';
import type { IngestHubStart } from '@kbn/ingest-hub-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import { i18n } from '@kbn/i18n';
import type { ObservabilityOnboardingConfig } from '../server';
import { PLUGIN_ID } from '../common';
import { ObservabilityOnboardingLocatorDefinition } from './locators/onboarding_locator/locator_definition';
import type { ObservabilityOnboardingPluginLocators } from './locators';
import type { ConfigSchema } from '.';
import {
  OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_FLOW_ERROR_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_FLOW_DATASET_DETECTED_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_WIRED_STREAMS_AUTO_ENABLED_EVENT,
} from '../common/telemetry_events';
export type ObservabilityOnboardingPluginSetup = void;
export type ObservabilityOnboardingPluginStart = void;

export interface ObservabilityOnboardingPluginSetupDeps {
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  discover: DiscoverSetup;
  share: SharePluginSetup;
  fleet: FleetSetup;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface ObservabilityOnboardingPluginStartDeps {
  data: DataPublicPluginStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  discover: DiscoverStart;
  share: SharePluginStart;
  fleet: FleetStart;
  cloud?: CloudStart;
  usageCollection?: UsageCollectionStart;
  streams?: StreamsPluginStart;
  ingestHub?: IngestHubStart;
}

export type ObservabilityOnboardingContextValue = CoreStart &
  ObservabilityOnboardingPluginStartDeps & { config: ConfigSchema };

export class ObservabilityOnboardingPlugin
  implements Plugin<ObservabilityOnboardingPluginSetup, ObservabilityOnboardingPluginStart>
{
  private locators?: ObservabilityOnboardingPluginLocators;
  private isServerless = false;

  constructor(private readonly ctx: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ObservabilityOnboardingPluginSetupDeps) {
    this.isServerless =
      Boolean(plugins.cloud?.isServerlessEnabled) ||
      this.ctx.env.packageInfo.buildFlavor === 'serverless';
    const stackVersion = this.ctx.env.packageInfo.version;
    const config = this.ctx.config.get<ObservabilityOnboardingConfig>();
    const isServerless = this.isServerless;
    const isDevEnvironment = this.ctx.env.mode.dev;
    const pluginSetupDeps = plugins;

    core.application.register({
      id: PLUGIN_ID,
      title: 'Observability Onboarding',
      order: 8500,
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
      keywords: ['add data'],
      async mount(appMountParameters: AppMountParameters) {
        // Load application bundle and Get start service
        const [{ renderApp }, [coreStart, corePlugins]] = await Promise.all([
          import('./application/app'),
          core.getStartServices(),
        ]);

        const { createCallApi } = await import('./services/rest/create_call_api');
        createCallApi(core);

        return renderApp({
          core: coreStart,
          deps: pluginSetupDeps,
          appMountParameters,
          corePlugins: corePlugins as ObservabilityOnboardingPluginStartDeps,
          config,
          context: {
            isDev: isDevEnvironment,
            isCloud: Boolean(pluginSetupDeps.cloud?.isCloudEnabled),
            isServerless,
            stackVersion,
            cloudServiceProvider: pluginSetupDeps.cloud?.csp,
          },
        });
      },
      visibleIn: ['globalSearch'],
    });

    this.locators = {
      onboarding: plugins.share.url.locators.create(new ObservabilityOnboardingLocatorDefinition()),
    };

    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT);
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT);
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT);
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_FLOW_ERROR_TELEMETRY_EVENT);
    core.analytics.registerEventType(
      OBSERVABILITY_ONBOARDING_FLOW_DATASET_DETECTED_TELEMETRY_EVENT
    );
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_WIRED_STREAMS_AUTO_ENABLED_EVENT);

    return {
      locators: this.locators,
      getLocator: () => this.locators?.onboarding,
    };
  }
  public start(core: CoreStart, plugins: ObservabilityOnboardingPluginStartDeps) {
    this.registerIngestFlows(core, plugins);
    return {
      locators: this.locators,
    };
  }

  private registerIngestFlows(core: CoreStart, plugins: ObservabilityOnboardingPluginStartDeps) {
    if (!plugins.ingestHub) {
      return;
    }

    const deps = {
      core,
      plugins,
      isServerless: this.isServerless,
    };

    const KubernetesFlow = dynamic(async () => {
      const [{ createIngestFlowComponent }, { KubernetesPanel }] = await Promise.all([
        import('./ingest_hub/render_ingest_flow'),
        import('./application/quickstart_flows/kubernetes'),
      ]);
      return { default: createIngestFlowComponent(deps, KubernetesPanel) };
    });

    plugins.ingestHub.registerIngestFlow({
      id: 'kubernetes',
      title: i18n.translate('xpack.observability_onboarding.ingestHub.kubernetes.title', {
        defaultMessage: 'Kubernetes',
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.ingestHub.kubernetes.description',
        { defaultMessage: 'Monitor your Kubernetes cluster with Elastic Agent' }
      ),
      icon: 'logoKubernetes',
      category: i18n.translate('xpack.observability_onboarding.ingestHub.category.containers', {
        defaultMessage: 'Containers',
      }),
      component: KubernetesFlow,
    });
  }
}
