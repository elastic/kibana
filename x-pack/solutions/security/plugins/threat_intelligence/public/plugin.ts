/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { THREAT_INTELLIGENCE_FEATURE_ID } from '../common';
import type {
  ThreatIntelligencePluginPublicSetup,
  ThreatIntelligencePluginPublicStart,
  ThreatIntelligencePublicSetupDependencies,
  ThreatIntelligencePublicStartDependencies,
} from './types';
import { registerAttachmentUiDefinitions } from './agent_builder/attachment_types';

export class ThreatIntelligencePlugin
  implements
    Plugin<
      ThreatIntelligencePluginPublicSetup,
      ThreatIntelligencePluginPublicStart,
      ThreatIntelligencePublicSetupDependencies,
      ThreatIntelligencePublicStartDependencies
    >
{
  constructor(_initContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<ThreatIntelligencePublicStartDependencies, ThreatIntelligencePluginPublicStart>,
    _plugins: ThreatIntelligencePublicSetupDependencies
  ): ThreatIntelligencePluginPublicSetup {
    // Register the Security > Intelligence Hub app. The mount handler
    // dynamically imports the dashboard so this plugin's setup stays cheap
    // when the user never opens the app.
    core.application.register({
      id: THREAT_INTELLIGENCE_FEATURE_ID,
      title: i18n.translate('xpack.threatIntelligence.app.title', {
        defaultMessage: 'Intelligence Hub',
      }),
      euiIconType: 'logoSecurity',
      order: 9050,
      visibleIn: ['globalSearch', 'sideNav'],
      category: DEFAULT_APP_CATEGORIES.security,
      async mount(params: AppMountParameters) {
        const [{ renderApp }, [coreStart]] = await Promise.all([
          import('./app/render'),
          core.getStartServices(),
        ]);
        return renderApp({ core: coreStart, params });
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    plugins: ThreatIntelligencePublicStartDependencies
  ): ThreatIntelligencePluginPublicStart {
    registerAttachmentUiDefinitions(plugins.agentBuilder, core);
    return {};
  }

  public stop() {}
}
