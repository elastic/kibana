/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLink, AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { registerSdlcWorkflowSteps } from './steps/register_workflow_steps';
import {
  PLUGIN_ID,
  SDLC_APP_BASE_PATH,
  SDLC_EXECUTIVE_ROUTE,
  SDLC_PIPELINE_ROUTE,
  SDLC_TEAMS_ROUTE,
} from '../common/constants';

export interface SdlcIntelPluginSetup {}
export interface SdlcIntelPluginStart {}

export interface SdlcIntelPluginSetupDeps {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export const PLUGIN_NAME = i18n.translate('xpack.sdlcIntel.pluginName', {
  defaultMessage: 'SDLC Intelligence',
});

const getSdlcAppDeepLinks = (): AppDeepLink[] => [
  {
    id: 'executive',
    title: i18n.translate('xpack.sdlcIntel.deepLink.executive', {
      defaultMessage: 'Executive roadmap',
    }),
    path: SDLC_EXECUTIVE_ROUTE,
  },
  {
    id: 'pipeline',
    title: i18n.translate('xpack.sdlcIntel.deepLink.pipeline', {
      defaultMessage: 'Phase pipeline',
    }),
    path: SDLC_PIPELINE_ROUTE,
  },
  {
    id: 'teams',
    title: i18n.translate('xpack.sdlcIntel.deepLink.teams', {
      defaultMessage: 'Team dimension',
    }),
    path: SDLC_TEAMS_ROUTE,
  },
];

export class SdlcIntelPlugin
  implements Plugin<SdlcIntelPluginSetup, SdlcIntelPluginStart, SdlcIntelPluginSetupDeps>
{
  public setup(core: CoreSetup, plugins: SdlcIntelPluginSetupDeps): SdlcIntelPluginSetup {
    registerSdlcWorkflowSteps(plugins.workflowsExtensions);

    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      appRoute: SDLC_APP_BASE_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      euiIconType: 'timeline',
      order: 9055,
      deepLinks: getSdlcAppDeepLinks(),
      keywords: ['sdlc', 'roadmap', 'epic', 'github', 'lifecycle'],
      mount: async (params: AppMountParameters) => {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });

    return {};
  }

  public start(_core: CoreStart): SdlcIntelPluginStart {
    return {};
  }
}

export const plugin = () => new SdlcIntelPlugin();
