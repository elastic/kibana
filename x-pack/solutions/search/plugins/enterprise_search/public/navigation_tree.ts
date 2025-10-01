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
import { STACK_MANAGEMENT_NAV_ID, DATA_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { SEARCH_HOMEPAGE } from '@kbn/deeplinks-search';
import { i18n } from '@kbn/i18n';

import type { AddSolutionNavigationArg } from '@kbn/navigation-plugin/public';

import { SEARCH_APPLICATIONS_PATH } from './applications/applications/routes';

import playgroundIcon from './assets/images/playground.svg';
import agentsIcon from './assets/images/robot.svg';

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
                      pathNameSerialized.startsWith(prepend('/app/elasticsearch/start')) ||
                      pathNameSerialized.startsWith(prepend('/app/elasticsearch/home'))
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
                  iconV2: agentsIcon,
                  link: 'agent_builder',
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
                    {
                      getIsActive: ({ pathNameSerialized, prepend }) => {
                        return (
                          pathNameSerialized.startsWith(
                            prepend('/app/elasticsearch/index_management/indices')
                          ) || pathNameSerialized.startsWith(prepend('/app/elasticsearch/indices'))
                        );
                      },
                      link: 'elasticsearchIndexManagement',
                      sideNavVersion: 'v1',
                    },
                    {
                      breadcrumbStatus: 'hidden',
                      iconV2: playgroundIcon,
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
                      ...(searchApps
                        ? {
                            children: searchApps.map(euiItemTypeToNodeDefinition),
                            isCollapsible: false,
                            renderAs: 'accordion',
                          }
                        : {}),
                      sideNavVersion: 'v1',
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
                      sideNavVersion: 'v1',
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
                  sideNavVersion: 'v1',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.relevance', {
                    defaultMessage: 'Relevance',
                  }),
                },
                {
                  children: [
                    {
                      id: 'ml_overview',
                      title: '',
                      children: [{ link: 'ml:overview' }, { link: 'ml:dataVisualizer' }],
                    },
                    {
                      id: 'category-anomaly_detection',
                      title: i18n.translate(
                        'xpack.enterpriseSearch.searchNav.machineLearning.anomalyDetection',
                        {
                          defaultMessage: 'Anomaly detection',
                        }
                      ),
                      breadcrumbStatus: 'hidden',
                      children: [{ link: 'ml:anomalyExplorer' }, { link: 'ml:singleMetricViewer' }],
                    },
                    {
                      id: 'category-data_frame analytics',
                      title: i18n.translate(
                        'xpack.enterpriseSearch.searchNav.machineLearning.dataFrameAnalytics',
                        {
                          defaultMessage: 'Data frame analytics',
                        }
                      ),
                      breadcrumbStatus: 'hidden',
                      children: [{ link: 'ml:resultExplorer' }, { link: 'ml:analyticsMap' }],
                    },
                    {
                      id: 'category-aiops_labs',
                      title: i18n.translate(
                        'xpack.enterpriseSearch.searchNav.machineLearning.aiops_labs',
                        {
                          defaultMessage: 'AIOps labs',
                        }
                      ),
                      breadcrumbStatus: 'hidden',
                      children: [
                        { link: 'ml:logRateAnalysis' },
                        { link: 'ml:logPatternAnalysis' },
                        { link: 'ml:changePointDetections' },
                      ],
                    },
                  ],
                  iconV2: 'machineLearningApp',
                  id: 'machine_learning',
                  renderAs: 'panelOpener',
                  sideNavVersion: 'v2',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.machineLearning', {
                    defaultMessage: 'Machine Learning',
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
                  iconV2: 'code',
                  id: 'dev_tools',
                  link: 'dev_tools',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.devTools', {
                    defaultMessage: 'Developer Tools',
                  }),
                },
                {
                  children: [
                    {
                      children: [
                        {
                          getIsActive: ({ pathNameSerialized, prepend }) => {
                            return (
                              pathNameSerialized.startsWith(
                                prepend('/app/elasticsearch/index_management/indices')
                              ) ||
                              pathNameSerialized.startsWith(
                                prepend('/app/management/data/index_management')
                              )
                            );
                          },
                          link: 'management:index_management',
                        },
                        { link: 'management:index_lifecycle_management' },
                        { link: 'management:snapshot_restore' },
                        { link: 'management:transform' },
                        { link: 'management:rollup_jobs' },
                      ],
                      title: i18n.translate(
                        'xpack.enterpriseSearch.searchNav.ingest.indices.title',
                        {
                          defaultMessage: 'Indices, data streams and roll ups',
                        }
                      ),
                    },
                    {
                      children: [
                        { link: 'management:ingest_pipelines' },
                        { link: 'management:pipelines' },
                      ],
                      title: i18n.translate(
                        'xpack.enterpriseSearch.searchNav.ingest.pipelines.title',
                        {
                          defaultMessage: 'Ingest',
                        }
                      ),
                    },
                    {
                      children: [{ link: 'searchSynonyms:synonyms' }, { link: 'searchQueryRules' }],
                      id: 'search_relevance',
                      title: i18n.translate(
                        'xpack.enterpriseSearch.searchNav.ingest.relevance.title',
                        {
                          defaultMessage: 'Relevance',
                        }
                      ),
                    },
                  ],
                  iconV2: 'database',
                  id: DATA_MANAGEMENT_NAV_ID, // This id can't be changed as we use it to anchor the tour step
                  sideNavVersion: 'v2',
                  renderAs: 'panelOpener',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.dataManagement', {
                    defaultMessage: 'Data management',
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
                      sideNavVersion: 'v1',
                    },
                    {
                      iconV2: 'managementApp',
                      children: [
                        {
                          children: [
                            {
                              id: 'monitoring',
                              link: 'monitoring',
                            },
                          ],
                          id: 'monitoring',
                          sideNavVersion: 'v2',
                          title: '',
                        },
                        {
                          children: [
                            { link: 'management:ingest_pipelines' },
                            { link: 'management:pipelines' },
                          ],
                          title: i18n.translate(
                            'xpack.enterpriseSearch.searchNav.management.ingest',
                            {
                              defaultMessage: 'Ingest',
                            }
                          ),
                          sideNavVersion: 'v1',
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
                          title: i18n.translate(
                            'xpack.enterpriseSearch.searchNav.management.data',
                            {
                              defaultMessage: 'Data',
                            }
                          ),
                          sideNavVersion: 'v1',
                        },
                        {
                          children: [
                            { link: 'management:triggersActionsAlerts' },
                            { link: 'management:triggersActions' },
                            { link: 'management:triggersActionsConnectors' },
                            { link: 'management:reporting' },
                            { link: 'management:jobsListLink' },
                            { link: 'management:watcher' },
                            { link: 'management:maintenanceWindows' },
                          ],
                          title: i18n.translate(
                            'xpack.enterpriseSearch.searchNav.management.alerts',
                            {
                              defaultMessage: 'Alerts and Insights',
                            }
                          ),
                        },
                        {
                          children: [
                            { link: 'management:trained_models' },
                            {
                              link: 'searchInferenceEndpoints:inferenceEndpoints',
                              sideNavVersion: 'v2',
                            },
                            { link: 'management:anomaly_detection' },
                            { link: 'management:analytics' },
                          ],
                          title: i18n.translate(
                            'xpack.enterpriseSearch.searchNav.management.machineLearning',
                            {
                              defaultMessage: 'Machine Learning',
                            }
                          ),
                        },
                        {
                          children: [
                            { link: 'management:genAiSettings' },
                            { link: 'management:agentBuilder' },
                            { link: 'management:aiAssistantManagementSelection' },
                          ],
                          title: i18n.translate('xpack.enterpriseSearch.searchNav.management.ai', {
                            defaultMessage: 'AI',
                          }),
                        },
                        {
                          children: [
                            { link: 'management:users' },
                            { link: 'management:roles' },
                            { link: 'management:api_keys' },
                            { link: 'management:role_mappings' },
                          ],
                          title: i18n.translate(
                            'xpack.enterpriseSearch.searchNav.management.security',
                            {
                              defaultMessage: 'Security',
                            }
                          ),
                        },
                        {
                          children: [
                            { link: 'management:cross_cluster_replication' },
                            { link: 'management:remote_clusters' },
                          ],
                          title: i18n.translate(
                            'xpack.enterpriseSearch.searchNav.management.dataV2',
                            {
                              defaultMessage: 'Data',
                            }
                          ),
                          sideNavVersion: 'v2',
                        },
                        {
                          children: [
                            { link: 'management:dataViews' },
                            { link: 'management:filesManagement' },
                            { link: 'visualize' },
                            { link: 'management:objects' },
                            { link: 'management:tags' },
                            { link: 'management:search_sessions' },
                            { link: 'management:spaces' },
                            { link: 'management:settings' },
                          ],
                          title: i18n.translate(
                            'xpack.enterpriseSearch.searchNav.management.kibana',
                            {
                              defaultMessage: 'Kibana',
                            }
                          ),
                        },
                        {
                          children: [
                            { link: 'management:license_management' },
                            { link: 'management:upgrade_assistant' },
                          ],
                          title: i18n.translate(
                            'xpack.enterpriseSearch.searchNav.management.stack',
                            {
                              defaultMessage: 'Stack',
                            }
                          ),
                        },
                      ],
                      id: STACK_MANAGEMENT_NAV_ID, // This id can't be changed as we use it to open the panel programmatically
                      renderAs: 'panelOpener',
                      spaceBefore: null,
                      title: i18n.translate('xpack.enterpriseSearch.searchNav.mngt', {
                        defaultMessage: 'Stack Management',
                      }),
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
