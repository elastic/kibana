/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Observable, debounceTime, map } from 'rxjs';

import type { EuiSideNavItemType } from '@elastic/eui';
import type {
  EuiSideNavItemTypeEnhanced,
  NavigationTreeDefinition,
  NodeDefinition,
} from '@kbn/core-chrome-browser';
import { SEARCH_HOMEPAGE } from '@kbn/deeplinks-search';
import { i18n } from '@kbn/i18n';

import type { AddSolutionNavigationArg } from '@kbn/navigation-plugin/public';

import { SEARCH_APPLICATIONS_PATH } from './applications/applications/routes';

export interface DynamicSideNavItems {
  collections?: Array<EuiSideNavItemType<unknown>>;
  indices?: Array<EuiSideNavItemType<unknown>>;
  searchApps?: Array<EuiSideNavItemType<unknown>>;
}

const title = i18n.translate(
  'xpack.enterpriseSearch.searchNav.headerSolutionSwitcher.searchSolutionTitle',
  {
    defaultMessage: 'Elasticsearch',
  }
);
const icon = 'logoElasticsearch';

const euiItemTypeToNodeDefinition = ({
  items,
  href,
  iconToString,
  id,
  isSelected = false,
  name,
  nameToString,
  onClick,
}: EuiSideNavItemTypeEnhanced<unknown>): NodeDefinition => {
  const isAccordion = items !== undefined;

  const node: NodeDefinition = {
    children: isAccordion ? items.map(euiItemTypeToNodeDefinition) : undefined,
    getIsActive: () => isSelected,
    href,
    icon: iconToString,
    id: `${id}`,
    onClick: onClick
      ? (e) => {
          e.stopPropagation();
          onClick(e);
        }
      : undefined,
    title: typeof name === 'string' ? name : nameToString,
    ...(isAccordion ? { isCollapsible: false, renderAs: 'accordion' } : {}),
  };

  return node;
};

export const getNavigationTreeDefinition = ({
  dynamicItems$,
}: {
  dynamicItems$: Observable<DynamicSideNavItems>;
}): AddSolutionNavigationArg => {
  return {
    dataTestSubj: 'searchSideNav',
    homePage: SEARCH_HOMEPAGE,
    icon,
    id: 'es',
    navigationTree$: dynamicItems$.pipe(
      debounceTime(10),
      map(({ searchApps, collections }) => {
        const navTree: NavigationTreeDefinition = {
          body: [
            {
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: SEARCH_HOMEPAGE,
                  title,
                  icon,
                  renderAs: 'home',
                  sideNavVersion: 'v2',
                  getIsActive: ({ pathNameSerialized, prepend }) => {
                    return (
                      pathNameSerialized.startsWith(prepend('/app/elasticsearch/overview')) ||
                      pathNameSerialized.startsWith(prepend('/app/elasticsearch/start')) ||
                      pathNameSerialized.startsWith(prepend('/app/elasticsearch/home'))
                    );
                  },
                },
                {
                  getIsActive: ({ pathNameSerialized, prepend }) => {
                    return (
                      pathNameSerialized.startsWith(prepend('/app/elasticsearch/overview')) ||
                      pathNameSerialized.startsWith(prepend('/app/elasticsearch/start'))
                    );
                  },
                  link: SEARCH_HOMEPAGE,
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.home', {
                    defaultMessage: 'Home',
                  }),
                  sideNavVersion: 'v1',
                },
                {
                  link: 'discover',
                },
                {
                  getIsActive: ({ pathNameSerialized, prepend }) => {
                    return pathNameSerialized.startsWith(prepend('/app/dashboards'));
                  },
                  link: 'dashboards',
                },
                {
                  badgeOptions: {
                    icon: 'beaker',
                    tooltip: i18n.translate(
                      'xpack.enterpriseSearch.searchNav.workflowsBadgeTooltip',
                      {
                        defaultMessage:
                          'This functionality is experimental and not supported. It may change or be removed at any time.',
                      }
                    ),
                  },
                  badgeTypeV2: 'techPreview' as const,
                  link: 'workflows',
                  withBadge: true,
                },
                {
                  children: [
                    { link: 'agent_builder:conversations' },
                    { link: 'agent_builder:tools' },
                    { link: 'agent_builder:agents' },
                  ],
                  id: 'agent_builder',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.chat', {
                    defaultMessage: 'Agents',
                  }),
                  renderAs: 'accordion',
                },
                {
                  children: [
                    {
                      getIsActive: ({ pathNameSerialized, prepend }) => {
                        return (
                          pathNameSerialized.startsWith(
                            prepend('/app/elasticsearch/index_management/indices')
                          ) || pathNameSerialized.startsWith(prepend('/app/elasticsearch/indices'))
                        );
                      },
                      link: 'elasticsearchIndexManagement',
                      iconV2: 'indexManagementApp',
                    },
                    {
                      breadcrumbStatus: 'hidden',
                      link: 'searchPlayground',
                    },
                    {
                      getIsActive: ({ pathNameSerialized, prepend }) => {
                        const someSubItemSelected = searchApps?.some((app) =>
                          app.items?.some((item) => item.isSelected)
                        );

                        if (someSubItemSelected) return false;

                        return (
                          pathNameSerialized ===
                          prepend(`/app/elasticsearch/applications${SEARCH_APPLICATIONS_PATH}`)
                        );
                      },
                      link: 'enterpriseSearchApplications:searchApplications',
                      iconV2: 'searchProfilerApp' /* TODO: review icon */,
                      renderAs: 'item',
                      ...(searchApps
                        ? {
                            children: searchApps.map(euiItemTypeToNodeDefinition),
                            isCollapsible: false,
                            renderAs: 'accordion',
                          }
                        : {}),
                    },
                    {
                      getIsActive: ({ pathNameSerialized, prepend }) => {
                        const someSubItemSelected = collections?.some((collection) =>
                          collection.items?.some((item) => item.isSelected)
                        );

                        if (someSubItemSelected) return false;

                        return pathNameSerialized === prepend(`/app/elasticsearch/analytics`);
                      },
                      link: 'enterpriseSearchAnalytics',
                      renderAs: 'item',
                      sideNavStatus: collections?.some((collection) =>
                        collection.items?.some((item) => item.isSelected)
                      )
                        ? 'visible'
                        : 'hidden',

                      ...(collections
                        ? {
                            children: collections.map(euiItemTypeToNodeDefinition),
                            isCollapsible: false,
                            renderAs: 'accordion',
                          }
                        : {}),
                    },
                  ],
                  id: 'build',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.build', {
                    defaultMessage: 'Build',
                  }),
                },
                {
                  children: [
                    { link: 'searchSynonyms:synonyms' },
                    { link: 'searchQueryRules' },
                    { link: 'searchInferenceEndpoints:inferenceEndpoints' },
                  ],
                  id: 'relevance',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.relevance', {
                    defaultMessage: 'Relevance',
                  }),
                },
              ],
              defaultIsCollapsed: false,
              icon,
              id: 'search_project_nav',
              isCollapsible: false,
              title,
              type: 'navGroup',
            },
          ],
          footer: [
            {
              children: [
                {
                  getIsActive: ({ pathNameSerialized, prepend }) => {
                    return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
                  },
                  id: 'dev_tools',
                  link: 'dev_tools',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.devTools', {
                    defaultMessage: 'Dev Tools',
                  }),
                },
                {
                  breadcrumbStatus: 'hidden',
                  children: [
                    {
                      link: 'management:trained_models',
                      title: i18n.translate(
                        'xpack.enterpriseSearch.searchNav.management.trainedModels',
                        {
                          defaultMessage: 'Trained Models',
                        }
                      ),
                    },
                    {
                      iconV2: 'managementApp',
                      children: [
                        {
                          children: [
                            { link: 'management:ingest_pipelines' },
                            { link: 'management:pipelines' },
                          ],
                          title: 'Ingest',
                        },
                        {
                          children: [
                            { link: 'management:index_management' },
                            { link: 'management:index_lifecycle_management' },
                            { link: 'management:snapshot_restore' },
                            { link: 'management:rollup_jobs' },
                            { link: 'management:transform' },
                            { link: 'management:cross_cluster_replication' },
                            { link: 'management:remote_clusters' },
                            { link: 'management:migrate_data' },
                          ],
                          title: 'Data',
                        },
                        {
                          children: [
                            { link: 'management:triggersActions' },
                            { link: 'management:cases' },
                            { link: 'management:triggersActionsConnectors' },
                            { link: 'management:reporting' },
                            { link: 'management:jobsListLink' },
                            { link: 'management:watcher' },
                            { link: 'management:maintenanceWindows' },
                          ],
                          title: 'Alerts and Insights',
                        },
                        {
                          children: [{ link: 'management:trained_models' }],
                          title: 'Machine Learning',
                        },
                        {
                          children: [
                            { link: 'management:users' },
                            { link: 'management:roles' },
                            { link: 'management:api_keys' },
                            { link: 'management:role_mappings' },
                          ],
                          title: 'Security',
                        },
                        {
                          children: [
                            { link: 'management:dataViews' },
                            { link: 'management:filesManagement' },
                            { link: 'management:objects' },
                            { link: 'management:tags' },
                            { link: 'management:search_sessions' },
                            { link: 'management:spaces' },
                            { link: 'management:settings' },
                          ],
                          title: 'Kibana',
                        },
                        {
                          children: [
                            { link: 'management:genAiSettings' },
                            { link: 'management:agentBuilder' },
                            { link: 'management:aiAssistantManagementSelection' },
                          ],
                          title: 'AI',
                        },
                        {
                          children: [
                            { link: 'management:license_management' },
                            { link: 'management:upgrade_assistant' },
                          ],
                          title: 'Stack',
                        },
                      ],
                      id: 'stack_management', // This id can't be changed as we use it to open the panel programmatically
                      renderAs: 'panelOpener',
                      spaceBefore: null,
                      title: i18n.translate('xpack.enterpriseSearch.searchNav.mngt', {
                        defaultMessage: 'Stack Management',
                      }),
                    },
                    {
                      id: 'monitoring',
                      link: 'monitoring',
                    },
                  ],
                  icon: 'gear',
                  id: 'project_settings_project_nav',
                  renderAs: 'accordion',
                  spaceBefore: null,
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.management', {
                    defaultMessage: 'Management',
                  }),
                },
              ],
              id: 'search_project_nav_footer',
              type: 'navGroup',
            },
          ],
        };

        return navTree;
      })
    ),
    title,
  };
};
