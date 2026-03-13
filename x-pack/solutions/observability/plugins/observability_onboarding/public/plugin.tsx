/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiButtonGroup, EuiCard } from '@elastic/eui';
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

import { versionStore } from './application/version_switcher_store';
import type { IngestHubVersion } from './application/version_switcher_store';

const VERSION_OPTIONS = [
  {
    id: 'blockUx' as IngestHubVersion,
    label: 'Block UX',
    title: '',
    toolTipContent: 'User lands in Kibana and is blocked and pushed to add data.',
    toolTipProps: { position: 'top' as const, className: 'onboardingSwitcherTooltip' },
  },
  {
    id: 'skipUx' as IngestHubVersion,
    label: 'Skip UX',
    title: '',
    toolTipContent: 'User lands in Kibana and is pushed to add data but can skip the flow.',
    toolTipProps: { position: 'top' as const, className: 'onboardingSwitcherTooltip' },
  },
];

const VersionSwitcherNavControl: React.FC<{ navigateToApp?: (appId: string, options?: { path?: string }) => Promise<void> }> = ({ navigateToApp }) => {
  const [active, setActive] = React.useState<IngestHubVersion>(versionStore.getSnapshot());
  const [portalContainer] = React.useState(() => {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.bottom = '16px';
    el.style.left = '16px';
    el.style.zIndex = '2147483647';
    document.body.appendChild(el);
    return el;
  });

  React.useEffect(() => {
    return () => {
      document.body.removeChild(portalContainer);
    };
  }, [portalContainer]);

  React.useEffect(() => {
    return versionStore.subscribe(() => setActive(versionStore.getSnapshot()));
  }, []);

  return ReactDOM.createPortal(
    <>
      <style>{`.onboardingSwitcherTooltip { z-index: 2147483647 !important; }`}</style>
      <EuiCard
      layout="horizontal"
      titleSize="xs"
      title={<span style={{ fontSize: 13 }}>Onboarding Experience</span>}
      description=""
      paddingSize="s"
      style={{ textAlign: 'center' }}
    >
      <EuiButtonGroup
        legend="Onboarding Experience"
        options={VERSION_OPTIONS}
        idSelected={active}
        onChange={(id) => {
          versionStore.setVersion(id as IngestHubVersion);
          const path = id === 'blockUx' ? '/ingest-hub/integrations' : '/ingest-hub';
          navigateToApp?.(PLUGIN_ID, { path });
        }}
        buttonSize="compressed"
        color="text"
        isFullWidth={false}
      />
    </EuiCard>
    </>,
    portalContainer
  );
};

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
}

export type ObservabilityOnboardingContextValue = CoreStart &
  ObservabilityOnboardingPluginStartDeps & { config: ConfigSchema };

export class ObservabilityOnboardingPlugin
  implements Plugin<ObservabilityOnboardingPluginSetup, ObservabilityOnboardingPluginStart>
{
  private locators?: ObservabilityOnboardingPluginLocators;

  constructor(private readonly ctx: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ObservabilityOnboardingPluginSetupDeps) {
    const stackVersion = this.ctx.env.packageInfo.version;
    const config = this.ctx.config.get<ObservabilityOnboardingConfig>();
    const isServerlessBuild = this.ctx.env.packageInfo.buildFlavor === 'serverless';
    const isDevEnvironment = this.ctx.env.mode.dev;
    const pluginSetupDeps = plugins;

    core.application.register({
      id: PLUGIN_ID,
      title: 'Observability Onboarding',
      order: 8500,
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
      keywords: ['add data'],
      deepLinks: [
        {
          id: 'ingest-hub',
          title: 'Get started',
          path: '/ingest-hub',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-integrations',
          title: 'Integrations',
          path: '/ingest-hub/integrations',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-api-endpoint',
          title: 'API Endpoint',
          path: '/ingest-hub/api-endpoint',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-platform-migration',
          title: 'Platform Migration',
          path: '/ingest-hub/platform-migration',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-dashboards',
          title: 'Dashboards',
          path: '/ingest-hub/dashboards',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-rules',
          title: 'Rules & Monitors',
          path: '/ingest-hub/rules',
          visibleIn: [],
        },
      ],
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
            isServerless: Boolean(pluginSetupDeps.cloud?.isServerlessEnabled) || isServerlessBuild,
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
  public start(core: CoreStart, _plugins: ObservabilityOnboardingPluginStartDeps) {
    core.chrome.navControls.registerRight({
      order: 9000,
      mount: (element) => {
        ReactDOM.render(<VersionSwitcherNavControl navigateToApp={core.application.navigateToApp} />, element, () => {});
        return () => {
          ReactDOM.unmountComponentAtNode(element);
        };
      },
    });

    return {
      locators: this.locators,
    };
  }
}
