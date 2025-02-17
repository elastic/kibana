/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Observable, map, debounceTime } from 'rxjs';

import type { EuiSideNavItemType } from '@elastic/eui';
import type {
  NavigationTreeDefinition,
  NodeDefinition,
  EuiSideNavItemTypeEnhanced,
} from '@kbn/core-chrome-browser';
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
    homePage: 'enterpriseSearch',
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
                  getIsActive: ({ pathNameSerialized, prepend }) => {
                    return (
                      pathNameSerialized.startsWith(prepend('/app/elasticsearch/overview')) ||
                      pathNameSerialized.startsWith(prepend('/app/elasticsearch/start'))
                    );
                  },
                  link: 'enterpriseSearch',
                },
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
                  children: [
                    {
                      link: 'discover',
                    },
                    {
                      getIsActive: ({ pathNameSerialized, prepend }) => {
                        return pathNameSerialized.startsWith(prepend('/app/dashboards'));
                      },
                      link: 'dashboards',
                    },
                  ],
                  id: 'kibana',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.kibana', {
                    defaultMessage: 'Kibana',
                  }),
                },
                {
                  children: [
                    {
                      breadcrumbStatus:
                        'hidden' /* management sub-pages set their breadcrumbs themselves */,
                      getIsActive: ({ pathNameSerialized, prepend }) => {
                        return (
                          pathNameSerialized.startsWith(
                            prepend('/app/management/data/index_management/')
                          ) || pathNameSerialized.startsWith(prepend('/app/elasticsearch/indices'))
                        );
                      },
                      link: 'management:index_management',
                    },
                    { link: 'enterpriseSearchContent:connectors' },
                    { link: 'enterpriseSearchContent:webCrawlers' },
                  ],
                  id: 'content',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.content', {
                    defaultMessage: 'Content',
                  }),
                },
                {
                  children: [
                    {
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
                      renderAs: 'item',
                      title: i18n.translate(
                        'xpack.enterpriseSearch.searchNav.build.searchApplications',
                        {
                          defaultMessage: 'Search applications',
                        }
                      ),
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
                    { link: 'searchInferenceEndpoints:inferenceEndpoints' },
                    { link: 'searchSynonyms:synonyms' },
                  ],
                  id: 'relevance',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.relevance', {
                    defaultMessage: 'Relevance',
                  }),
                },
                {
                  children: [{ link: 'maps' }, { link: 'canvas' }, { link: 'graph' }],
                  id: 'otherTools',
                  renderAs: 'accordion',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.otherTools', {
                    defaultMessage: 'Other tools',
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
            { type: 'recentlyAccessed' },
            {
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:modelManagement',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.searchNav.management.trainedModels',
                    {
                      defaultMessage: 'Trained models',
                    }
                  ),
                },
                {
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
                        { link: 'management:aiAssistantManagementSelection' },
                        { link: 'management:spaces' },
                        { link: 'management:settings' },
                      ],
                      title: 'Kibana',
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
              title: i18n.translate('xpack.enterpriseSearch.searchNav.management', {
                defaultMessage: 'Management',
              }),
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
