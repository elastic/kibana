/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { CoreSetup, Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import type {
  WorkplaceAIAppPluginSetup,
  WorkplaceAIAppPluginStart,
  WorkplaceAIAppPluginSetupDependencies,
  WorkplaceAIAppPluginStartDependencies,
} from './types';
import { registerApp } from './application';
import { type WorkplaceAIServices } from './services';
import { WORKPLACE_AI_APP_ID } from '../common/features';
import agentsIcon from './assets/robot.svg';

export class WorkplaceAIAppPlugin
  implements
    Plugin<
      WorkplaceAIAppPluginSetup,
      WorkplaceAIAppPluginStart,
      WorkplaceAIAppPluginSetupDependencies,
      WorkplaceAIAppPluginStartDependencies
    >
{
  private services?: WorkplaceAIServices;
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.services = {};
    this.logger = context.logger.get('workplaceai.app.public');
  }

  public setup(
    core: CoreSetup<WorkplaceAIAppPluginStartDependencies, WorkplaceAIAppPluginStart>,
    { dataSourcesRegistry, home }: WorkplaceAIAppPluginSetupDependencies
  ): WorkplaceAIAppPluginSetup {
    registerApp({
      core,
      getServices: () => {
        if (!this.services) {
          throw new Error('getServices called before plugin start');
        }
        return this.services;
      },
    });

    // Register Workplace AI solution on home page
    if (home) {
      home.featureCatalogue.registerSolution({
        id: 'workplaceAI', // Must match the category ID from DEFAULT_APP_CATEGORIES.workplaceAI
        title: i18n.translate('xpack.workplaceai.solution.title', {
          defaultMessage: 'Workplace AI',
        }),
        description: i18n.translate('xpack.workplaceai.solution.description', {
          defaultMessage:
            'Build intelligent workplace experiences with AI-powered search, chat, and automation.',
        }),
        icon: 'logoElasticsearch',
        path: `/app/${WORKPLACE_AI_APP_ID}`,
        order: 400,
      });
    }

    return {};
  }

  public start(
    { http }: CoreStart,
    pluginsStart: WorkplaceAIAppPluginStartDependencies
  ): WorkplaceAIAppPluginStart {
    this.logger.info('WorkplaceAIAppPlugin started.');

    // Register solution navigation for stateful (hosted) mode
    if (pluginsStart.navigation) {
      pluginsStart.navigation.addSolutionNavigation({
        id: 'workplaceai',
        title: i18n.translate('xpack.workplaceai.nav.title', {
          defaultMessage: 'Workplace AI',
        }),
        icon: 'logoElasticsearch',
        homePage: WORKPLACE_AI_APP_ID,
        dataTestSubj: 'workplaceAISideNav',
        navigationTree$: of({
          body: [
            {
              link: WORKPLACE_AI_APP_ID,
              title: i18n.translate('xpack.workplaceai.nav.home', {
                defaultMessage: 'Workplace AI',
              }),
              icon: 'logoElasticsearch',
              renderAs: 'home',
              breadcrumbStatus: 'hidden',
            },
            {
              icon: agentsIcon,
              link: 'agent_builder',
            },
            {
              link: 'data_connectors',
              icon: 'plugs',
              badgeType: 'techPreview',
            },
            {
              link: 'workflows',
              badgeType: 'techPreview' as const,
            },
            {
              link: 'dashboards',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/dashboards'));
              },
            },
            {
              link: 'discover',
            },
          ],
          footer: [
            {
              id: 'devTools',
              title: i18n.translate('xpack.workplaceai.nav.devTools', {
                defaultMessage: 'Developer tools',
              }),
              link: 'dev_tools',
              icon: 'editorCodeBlock',
            },
            {
              id: 'management',
              title: i18n.translate('xpack.workplaceai.nav.management', {
                defaultMessage: 'Management',
              }),
              icon: 'gear',
              renderAs: 'panelOpener',
              children: [
                {
                  title: i18n.translate('xpack.workplaceai.nav.management.data', {
                    defaultMessage: 'Data',
                  }),
                  breadcrumbStatus: 'hidden',
                  children: [
                    { link: 'management:index_management', breadcrumbStatus: 'hidden' },
                    { link: 'management:transform', breadcrumbStatus: 'hidden' },
                    { link: 'management:ingest_pipelines', breadcrumbStatus: 'hidden' },
                    { link: 'management:dataViews', breadcrumbStatus: 'hidden' },
                    { link: 'management:jobsListLink', breadcrumbStatus: 'hidden' },
                    { link: 'management:pipelines', breadcrumbStatus: 'hidden' },
                    { link: 'management:data_quality', breadcrumbStatus: 'hidden' },
                    { link: 'management:data_usage', breadcrumbStatus: 'hidden' },
                  ],
                },
                {
                  title: i18n.translate('xpack.workplaceai.nav.management.access', {
                    defaultMessage: 'Access',
                  }),
                  breadcrumbStatus: 'hidden',
                  children: [{ link: 'management:api_keys', breadcrumbStatus: 'hidden' }],
                },
                {
                  title: i18n.translate('xpack.workplaceai.nav.management.alertsAndInsights', {
                    defaultMessage: 'Alerts and insights',
                  }),
                  breadcrumbStatus: 'hidden',
                  children: [
                    { link: 'management:triggersActionsConnectors', breadcrumbStatus: 'hidden' },
                    { link: 'management:maintenanceWindows', breadcrumbStatus: 'hidden' },
                  ],
                },
                {
                  title: i18n.translate('xpack.workplaceai.nav.management.ai', {
                    defaultMessage: 'AI',
                  }),
                  breadcrumbStatus: 'hidden',
                  children: [
                    { link: 'management:genAiSettings', breadcrumbStatus: 'hidden' },
                    {
                      link: 'management:observabilityAiAssistantManagement',
                      breadcrumbStatus: 'hidden',
                    },
                  ],
                },
                {
                  title: i18n.translate('xpack.workplaceai.nav.management.content', {
                    defaultMessage: 'Content',
                  }),
                  breadcrumbStatus: 'hidden',
                  children: [
                    { link: 'management:spaces', breadcrumbStatus: 'hidden' },
                    { link: 'management:objects', breadcrumbStatus: 'hidden' },
                    { link: 'management:filesManagement', breadcrumbStatus: 'hidden' },
                    { link: 'management:reporting', breadcrumbStatus: 'hidden' },
                    { link: 'management:tags', breadcrumbStatus: 'hidden' },
                  ],
                },
                {
                  title: i18n.translate('xpack.workplaceai.nav.management.other', {
                    defaultMessage: 'Other',
                  }),
                  breadcrumbStatus: 'hidden',
                  children: [{ link: 'management:settings', breadcrumbStatus: 'hidden' }],
                },
              ],
            },
            {
              id: 'cloudLinkUserAndRoles',
              cloudLink: 'userAndRoles',
            },
            {
              id: 'cloudLinkBilling',
              cloudLink: 'billingAndSub',
            },
          ],
        }),
      });
    }

    return {};
  }

  public stop() {}
}
