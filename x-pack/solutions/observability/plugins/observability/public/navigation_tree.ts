/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { AddSolutionNavigationArg } from '@kbn/navigation-plugin/public';
import { STACK_MANAGEMENT_NAV_ID, DATA_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { combineLatest, map, of } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import type { Location } from 'history';
import {
  getInstalledIntegrations,
  getIntegrationDeepLinkId,
  getFavoritesState$,
  getNestedNavEnabled$,
  getIntegrationsSearch$,
  type FavoritesState,
  type IntegrationSummary,
} from './entity_centric_lab_integrations';
import type { ObservabilityPublicPluginsStart } from './plugin';

const title = i18n.translate(
  'xpack.observability.obltNav.headerSolutionSwitcher.obltSolutionTitle',
  {
    defaultMessage: 'Observability',
  }
);
const icon = 'logoObservability';

/**
 * CONTEXT: After restructuring Dashboards to integrate the Visualize library,
 * we need to maintain proper navigation state when users edit visualizations accessed
 * from the Dashboard Viz tab. This keeps the Dashboard nav item active during editing.
 */
function isEditingFromDashboard(
  location: Location,
  pathNameSerialized: string,
  prepend: (path: string) => string
): boolean {
  const vizApps = ['/app/visualize', '/app/maps', '/app/lens'];
  const isVizApp = vizApps.some((app) => pathNameSerialized.startsWith(prepend(app)));
  const hasOriginatingApp =
    location.search.includes('originatingApp=dashboards') ||
    location.hash.includes('originatingApp=dashboards');
  return isVizApp && hasOriginatingApp;
}

function createNavTree({
  streamsAvailable,
  showAiAssistant,
  isCloudEnabled,
  showAlertingV2,
  ingestHubAvailable,
  entityCentricLabEnabled,
  infraShortTermEnabled,
  superShortTermEnabled,
  favoritesState = { ungrouped: [], groups: [] },
  nestedNavEnabled = false,
  installedIntegrations = [],
  integrationsSearchQuery = '',
  toAbsoluteHref = (path: string) => path,
}: {
  streamsAvailable?: boolean;
  showAiAssistant?: boolean;
  isCloudEnabled?: boolean;
  showAlertingV2?: boolean;
  ingestHubAvailable?: boolean;
  entityCentricLabEnabled?: boolean;
  infraShortTermEnabled?: boolean;
  superShortTermEnabled?: boolean;
  favoritesState?: FavoritesState;
  nestedNavEnabled?: boolean;
  installedIntegrations?: readonly IntegrationSummary[];
  // Free-text nav filter for the super-short-term integrations panel; matches
  // integration names across both the starred and installed lists.
  integrationsSearchQuery?: string;
  // Builds a fully-qualified (http[s]://) URL for a Kibana app path. Chrome's
  // nav validation rejects any `href` that isn't an absolute URL, so this must
  // include the origin — a bare `basePath.prepend()` path would throw and blank
  // the whole side nav.
  toAbsoluteHref?: (path: string) => string;
}) {
  // The three lab modes are mutually exclusive; entity-centric takes precedence,
  // then infra-short-term, then super-short-term. Infra-short-term reuses the
  // Entities panel but renames it to "Infrastructure" and scopes it to a
  // reduced category set. Super-short-term renames it to "Infrastructure" too
  // but swaps the categories for an integrations content hub.
  const infraShortTermMode = Boolean(infraShortTermEnabled) && !entityCentricLabEnabled;
  const superShortTermMode =
    Boolean(superShortTermEnabled) && !entityCentricLabEnabled && !infraShortTermMode;
  const infraPanelMode = infraShortTermMode || superShortTermMode;
  const showEntitiesPanel =
    Boolean(streamsAvailable) &&
    (Boolean(entityCentricLabEnabled) || infraShortTermMode || superShortTermMode);

  const entitiesPanelTitle = infraPanelMode
    ? i18n.translate('xpack.observability.obltNav.infrastructure', {
        defaultMessage: 'Infrastructure',
      })
    : i18n.translate('xpack.observability.obltNav.entities', {
        defaultMessage: 'Entities',
      });

  // Super-short-term: the "Infrastructure" panel becomes an integrations hub
  // mirroring the design mockup. A top group shows the existing Infrastructure
  // touchpoints ("Infrastructure inventory", "Hosts") to illustrate where the
  // hub fits in the current experience, then a "Starred integrations" section
  // (the starred integrations), then the full "All installed integrations"
  // list (led by the "Overview" page). Each integration links to its detail
  // page via a per-integration deep link registered in streams_app (a relative
  // `href` would make the chrome nav throw and blank the whole side nav; an
  // unresolved `link` is safely dropped instead).
  const integrationNode = (integration: IntegrationSummary, prefix: string) => ({
    id: `entityCentricLab-integration-${prefix}-${integration.id}`,
    title: integration.name,
    icon: integration.icon,
    // The id is computed, but every installed integration has a matching
    // `streams:integrations<Name>` deep link. Cast to a known member to satisfy
    // the deep-link union; the runtime value is the real (resolvable) id.
    link: `streams:${getIntegrationDeepLinkId(integration.id)}` as 'streams:integrations',
  });

  const findIntegration = (id: string): IntegrationSummary | undefined =>
    installedIntegrations.find((integration) => integration.id === id);

  const toIntegrations = (ids: readonly string[]): IntegrationSummary[] =>
    ids
      .map(findIntegration)
      .filter((integration): integration is IntegrationSummary => Boolean(integration));

  // Nav search filter — matches integration names across both lists. Applied
  // only to integration items; the "All integrations" overview link always
  // stays visible so the panel never empties. The search box is gated behind the
  // grouped-favorites toggle, so ignore any leftover query when it's off.
  const normalizedQuery = (nestedNavEnabled ? integrationsSearchQuery : '').trim().toLowerCase();
  const matchesQuery = (integration: IntegrationSummary): boolean =>
    normalizedQuery.length === 0 || integration.name.toLowerCase().includes(normalizedQuery);
  const filterByQuery = (integrations: IntegrationSummary[]): IntegrationSummary[] =>
    integrations.filter(matchesQuery);

  const favoriteIntegrationIds = [
    ...favoritesState.ungrouped,
    ...favoritesState.groups.flatMap((group) => group.integrationIds),
  ];

  // Ungrouped stars render as flat links; grouped stars render under their group
  // (as a nav sub-group) only when the nested-nav opt-in is on. When it's off
  // everything is a single flat list, matching the original behaviour.
  const ungroupedFavoriteIntegrations = filterByQuery(
    nestedNavEnabled
      ? toIntegrations(favoritesState.ungrouped)
      : toIntegrations(favoriteIntegrationIds)
  );

  const favoriteGroupNodes = nestedNavEnabled
    ? favoritesState.groups
        .map((group) => {
          const groupIntegrations = filterByQuery(toIntegrations(group.integrationIds));
          const integrationChildren = groupIntegrations.map((integration) =>
            integrationNode(integration, `group-${group.id}`)
          );
          // As soon as a group holds more than one integration, lead it with an
          // auto-generated group-scoped "Overview" (mirrors the top-level "All
          // integrations" overview, filtered to this group). Uses an absolute
          // href because the group id is dynamic — no static deep link exists.
          const overviewPath = `/app/streams/integrations/groups/${group.id}`;
          const overviewChild =
            groupIntegrations.length > 1
              ? [
                  {
                    id: `entityCentricLab-groupOverview-${group.id}`,
                    href: toAbsoluteHref(overviewPath),
                    title: i18n.translate(
                      'xpack.observability.obltNav.integrations.groupOverview',
                      { defaultMessage: 'Overview' }
                    ),
                    // href-only nodes aren't in the deep-link active set, so mark
                    // active by URL to highlight it and keep the panel open.
                    getIsActive: ({
                      pathNameSerialized,
                      prepend,
                    }: {
                      pathNameSerialized: string;
                      prepend: (path: string) => string;
                    }) => pathNameSerialized.startsWith(prepend(overviewPath)),
                  },
                ]
              : [];
          return {
            id: group.id,
            title: group.name,
            // No `link`/`renderAs`: a childful, link-less node becomes a nav
            // sub-group (one extra nesting level) in the chrome mapper.
            children: [...overviewChild, ...integrationChildren],
          };
        })
        // Empty groups persist in the store but have nothing to render in the
        // nav; they reappear as soon as they contain an integration again.
        .filter((group) => group.children.length > 0)
    : [];

  const starredSectionChildren = [
    ...ungroupedFavoriteIntegrations.map((integration) => integrationNode(integration, 'starred')),
    ...favoriteGroupNodes,
  ];

  // A starred integration is pulled up into the "Starred integrations" section
  // and removed from "Installed integrations" so it appears exactly once. Two
  // nodes sharing the same deep link would otherwise make the chrome nav
  // highlight the first (starred) copy no matter which one was clicked.
  const unstarredIntegrations = filterByQuery(
    installedIntegrations.filter((integration) => !favoriteIntegrationIds.includes(integration.id))
  );

  const superShortTermPanelChildren = [
    // The illustrative "Infrastructure inventory" / "Hosts" touchpoints and the
    // integrations search box are rendered in the side-panel header (registered
    // by streams_app) so the search sits directly above "Starred integrations",
    // matching the design. Chrome side-nav sections can't host arbitrary content
    // (like an input) between them, hence the header slot.
    //
    // Only render the "Starred integrations" section when something is starred,
    // to avoid an empty section header. Children are ungrouped stars followed by
    // any user-defined groups (nested-nav mode only).
    ...(starredSectionChildren.length > 0
      ? [
          {
            id: 'entityCentricLab-starredIntegrations',
            title: i18n.translate('xpack.observability.obltNav.integrations.starred', {
              defaultMessage: 'Starred integrations',
            }),
            children: starredSectionChildren,
          },
        ]
      : []),
    {
      id: 'entityCentricLab-allIntegrations',
      title: i18n.translate('xpack.observability.obltNav.integrations.all', {
        defaultMessage: 'Installed integrations',
      }),
      // "Overview" spans every installed integration, so it heads this list
      // rather than living under "Starred integrations". Starred integrations
      // are shown only in the section above, not duplicated here.
      children: [
        {
          id: 'entityCentricLab-integrationsOverview',
          link: 'streams:integrations' as const,
          title: i18n.translate('xpack.observability.obltNav.integrations.overview', {
            defaultMessage: 'All integrations',
          }),
        },
        ...unstarredIntegrations.map((integration) => integrationNode(integration, 'all')),
      ],
    },
  ];

  // Cloud is a nested panel: clicking it navigates to the Cloud landing page,
  // while the chevron opens a sub-panel of providers (AWS / GCP / Azure), each
  // of which opens its own sub-panel of services.
  const cloudCategoryNode = {
    id: 'entityCentricLab-entitiesCloud',
    link: 'streams:entitiesCloud' as const,
    renderAs: 'panelOpener' as const,
    children: [
      {
        children: [
          {
            id: 'entityCentricLab-entitiesCloudAws',
            link: 'streams:entitiesCloudAws' as const,
            renderAs: 'panelOpener' as const,
            children: [
              {
                children: [
                  {
                    id: 'entityCentricLab-entitiesCloudAwsEc2',
                    link: 'streams:entitiesCloudAwsEc2' as const,
                  },
                  {
                    id: 'entityCentricLab-entitiesCloudAwsLambda',
                    link: 'streams:entitiesCloudAwsLambda' as const,
                  },
                  {
                    id: 'entityCentricLab-entitiesCloudAwsS3',
                    link: 'streams:entitiesCloudAwsS3' as const,
                  },
                ],
              },
            ],
          },
          {
            id: 'entityCentricLab-entitiesCloudGcp',
            link: 'streams:entitiesCloudGcp' as const,
            renderAs: 'panelOpener' as const,
            children: [
              {
                children: [
                  {
                    id: 'entityCentricLab-entitiesCloudGcpCompute',
                    link: 'streams:entitiesCloudGcpCompute' as const,
                  },
                  {
                    id: 'entityCentricLab-entitiesCloudGcpFunctions',
                    link: 'streams:entitiesCloudGcpFunctions' as const,
                  },
                  {
                    id: 'entityCentricLab-entitiesCloudGcpStorage',
                    link: 'streams:entitiesCloudGcpStorage' as const,
                  },
                ],
              },
            ],
          },
          {
            id: 'entityCentricLab-entitiesCloudAzure',
            link: 'streams:entitiesCloudAzure' as const,
            renderAs: 'panelOpener' as const,
            children: [
              {
                children: [
                  {
                    id: 'entityCentricLab-entitiesCloudAzureVm',
                    link: 'streams:entitiesCloudAzureVm' as const,
                  },
                  {
                    id: 'entityCentricLab-entitiesCloudAzureFunctions',
                    link: 'streams:entitiesCloudAzureFunctions' as const,
                  },
                  {
                    id: 'entityCentricLab-entitiesCloudAzureBlob',
                    link: 'streams:entitiesCloudAzureBlob' as const,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const hostsCategoryNode = {
    id: 'entityCentricLab-entitiesHosts',
    link: 'streams:entitiesHosts' as const,
  };
  const kubernetesCategoryNode = {
    id: 'entityCentricLab-entitiesKubernetes',
    link: 'streams:entitiesKubernetes' as const,
  };
  const databasesCategoryNode = {
    id: 'entityCentricLab-entitiesDatabases',
    link: 'streams:entitiesDatabases' as const,
  };
  const servicesCategoryNode = {
    id: 'entityCentricLab-entitiesServices',
    link: 'streams:entitiesServices' as const,
  };
  const middlewaresCategoryNode = {
    id: 'entityCentricLab-entitiesMiddlewares',
    link: 'streams:entitiesMiddlewares' as const,
  };
  const llmsCategoryNode = {
    id: 'entityCentricLab-entitiesLlms',
    link: 'streams:entitiesLlms' as const,
  };
  // Catch-all bucket for entity types whose `category` field doesn't match a
  // canonical nav section (legacy seed values, "+ Create new category" inputs).
  const otherCategoryNode = {
    id: 'entityCentricLab-entitiesOther',
    link: 'streams:entitiesOther' as const,
  };

  // Full category list for the entity-centric lab. The Cloud node keeps its
  // nested `panelOpener` (in the current chrome side-nav only the top-level
  // Cloud link renders; providers surface via Cloud's own flyout panel).
  const entityCentricCategoryChildren = [
    hostsCategoryNode,
    kubernetesCategoryNode,
    databasesCategoryNode,
    servicesCategoryNode,
    cloudCategoryNode,
    middlewaresCategoryNode,
    llmsCategoryNode,
    otherCategoryNode,
  ];

  const entitiesAllSection = {
    children: [
      {
        id: 'entityCentricLab-entitiesAll',
        link: 'streams:entitiesAll' as const,
      },
    ],
  };

  // The chrome side-nav renderer can't draw an inline collapsible group, so in
  // Infra-short-term mode "Cloud" is rendered as a *section header* (no link)
  // with the three providers as flat links beneath it — always visible, no
  // chevron. This is the closest supported approximation of the nested tree.
  const infraCloudSection = {
    id: 'entityCentricLab-infraCloudSection',
    title: i18n.translate('xpack.observability.obltNav.cloud', {
      defaultMessage: 'Cloud',
    }),
    children: [
      {
        id: 'entityCentricLab-entitiesCloudAws',
        link: 'streams:entitiesCloudAws' as const,
      },
      {
        id: 'entityCentricLab-entitiesCloudGcp',
        link: 'streams:entitiesCloudGcp' as const,
      },
      {
        id: 'entityCentricLab-entitiesCloudAzure',
        link: 'streams:entitiesCloudAzure' as const,
      },
    ],
  };

  // Panel sections differ by mode. Entity-centric keeps the full category list
  // plus a "Manage entity types" shortcut. Infra-short-term shows "All
  // entities", the Cloud section (with AWS/GCP/Azure), then the remaining flat
  // categories (Databases, Kubernetes).
  const entitiesPanelChildren = superShortTermMode
    ? superShortTermPanelChildren
    : infraShortTermMode
    ? [
        entitiesAllSection,
        infraCloudSection,
        {
          children: [databasesCategoryNode, kubernetesCategoryNode],
        },
      ]
    : [
        entitiesAllSection,
        {
          children: entityCentricCategoryChildren,
        },
        {
          // Duplicate of the Streams panel's "Manage entity types" entry: the
          // same route is reachable from both panels per the lab design.
          children: [
            {
              id: 'entityCentricLab-manage-fromEntities',
              link: 'streams:manageEntityTypes' as const,
            },
          ],
        },
      ];

  const navTree: NavigationTreeDefinition = {
    body: [
      {
        link: 'observability-overview',
        title,
        icon,
        renderAs: 'home',
      },
      {
        title: i18n.translate('xpack.observability.obltNav.discover', {
          defaultMessage: 'Discover',
        }),
        link: 'discover',
        icon: 'productDiscover',
      },
      {
        link: 'dashboards',
        icon: 'productDashboard',
        getIsActive: ({ pathNameSerialized, prepend, location }) =>
          pathNameSerialized.startsWith(prepend('/app/dashboards')) ||
          isEditingFromDashboard(location, pathNameSerialized, prepend),
      },
      {
        link: 'workflows',
      },
      {
        link: 'observability-overview:alerts',
        icon: 'warning',
      },
      {
        link: 'observability-overview:cases',
        children: [
          {
            link: 'observability-overview:cases_configure',
          },
          {
            link: 'observability-overview:cases_create',
          },
        ],
        icon: 'briefcase',
      },
      {
        link: 'slo',
        icon: 'visGauge',
      },
      ...(showEntitiesPanel
        ? [
            {
              // Entity-centric / Infra-short-term lab: top-level panel that
              // exposes the "All entities" landing page and the per-category
              // sub-pages. Sits above Streams so the user lands on it first
              // when a lab mode is enabled. In Infra-short-term mode it is
              // titled "Infrastructure", scoped to a reduced category set, and
              // drops the "Manage entity types" entry entirely.
              id: 'entities',
              // Super-short-term lands on the starred integrations Overview;
              // the other lab modes land on the "All entities" inventory.
              link: superShortTermMode
                ? ('streams:integrations' as const)
                : ('streams:entitiesAll' as const),
              // `cluster` renders three connected circles — reads as
              // "connected things / a network of entities" and is the closest
              // generic-entity metaphor available in the current EUI icon set.
              icon: 'cluster',
              title: entitiesPanelTitle,
              renderAs: 'panelOpener' as const,
              children: entitiesPanelChildren,
            },
          ]
        : []),
      ...(streamsAvailable
        ? [
            entityCentricLabEnabled
              ? {
                  // When the entity-centric lab is on, Streams becomes a
                  // panel-opener that surfaces the existing `All streams`
                  // entry alongside the prototype `Manage entity types`
                  // shortcut. The parent still navigates to /app/streams
                  // when clicked directly (mirrors the Infrastructure
                  // pattern). Each child sits in its own group so the panel
                  // renders a visual gap between them.
                  id: 'streams',
                  link: 'streams' as const,
                  icon: 'productStreamsWired',
                  renderAs: 'panelOpener' as const,
                  children: [
                    {
                      children: [
                        {
                          link: 'streams' as const,
                          title: i18n.translate('xpack.observability.obltNav.streams.allStreams', {
                            defaultMessage: 'All streams',
                          }),
                          getIsActive: ({
                            pathNameSerialized,
                            prepend,
                          }: {
                            pathNameSerialized: string;
                            prepend: (path: string) => string;
                          }) => {
                            const root = prepend('/app/streams');
                            return (
                              pathNameSerialized === root ||
                              pathNameSerialized === `${root}/` ||
                              (pathNameSerialized.startsWith(root) &&
                                !pathNameSerialized.startsWith(`${root}/manage-entity-types`) &&
                                !pathNameSerialized.startsWith(`${root}/significant-events`))
                            );
                          },
                        },
                      ],
                    },
                    {
                      // Sits between `All streams` and `Manage entity types` —
                      // its own group so the panel renders visual gaps on
                      // either side. Backed by the `streams:significantEvents`
                      // deep link registered in the streams app plugin.
                      children: [
                        {
                          id: 'entityCentricLab-significantEvents',
                          link: 'streams:significantEvents' as const,
                        },
                      ],
                    },
                    {
                      children: [
                        {
                          id: 'entityCentricLab-manage',
                          link: 'streams:manageEntityTypes' as const,
                        },
                      ],
                    },
                  ],
                }
              : {
                  link: 'streams' as const,
                  icon: 'productStreamsWired',
                },
          ]
        : []),
      {
        id: 'applications',
        title: i18n.translate('xpack.observability.obltNav.applications', {
          defaultMessage: 'Applications',
        }),
        renderAs: 'panelOpener',
        icon: 'spaces',
        children: [
          {
            id: 'apm',
            children: [
              {
                link: 'apm:service-map',
                getIsActive: ({ pathNameSerialized, prepend }) => {
                  return pathNameSerialized.startsWith(prepend('/app/apm/service-map'));
                },
                sideNavStatus: 'hidden',
              },
              {
                link: 'apm:service-groups-list',
                getIsActive: ({ pathNameSerialized, prepend }) => {
                  return pathNameSerialized.startsWith(prepend('/app/apm/service-groups'));
                },
                sideNavStatus: 'hidden',
              },
              {
                link: 'apm:services',
                getIsActive: ({ pathNameSerialized }) => {
                  const regex = /app\/apm\/.*service.*/;
                  return regex.test(pathNameSerialized);
                },
              },
              {
                link: 'apm:traces',
                getIsActive: ({ pathNameSerialized, prepend }) => {
                  return pathNameSerialized.startsWith(prepend('/app/apm/traces'));
                },
              },
              {
                link: 'apm:dependencies',
                getIsActive: ({ pathNameSerialized, prepend }) => {
                  return pathNameSerialized.startsWith(prepend('/app/apm/dependencies'));
                },
              },
              {
                link: 'ux',
                title: i18n.translate('xpack.observability.obltNav.apm.ux', {
                  defaultMessage: 'User experience',
                }),
              },
            ],
          },
          {
            id: 'synthetics',
            title: i18n.translate('xpack.observability.obltNav.apm.syntheticsGroupTitle', {
              defaultMessage: 'Synthetics',
            }),
            children: [
              {
                link: 'synthetics',
                title: i18n.translate('xpack.observability.obltNav.apm.synthetics.monitors', {
                  defaultMessage: 'Monitors',
                }),
              },
              {
                link: 'synthetics:certificates',
                title: i18n.translate(
                  'xpack.observability.obltNav.apm.synthetics.tlsCertificates',
                  {
                    defaultMessage: 'TLS certificates',
                  }
                ),
              },
            ],
          },
          {
            id: 'uptime',
            title: i18n.translate('xpack.observability.obltNav.apm.uptimeGroupTitle', {
              defaultMessage: 'Uptime',
            }),
            children: [
              {
                link: 'uptime',
                title: i18n.translate('xpack.observability.obltNav.apm.uptime.monitors', {
                  defaultMessage: 'Uptime monitors',
                }),
              },
              {
                link: 'uptime:Certificates',
                title: i18n.translate('xpack.observability.obltNav.apm.uptime.tlsCertificates', {
                  defaultMessage: 'TLS certificates',
                }),
              },
            ],
          },
        ],
      },
      {
        id: 'metrics',
        link: 'metrics:inventory',
        title: i18n.translate('xpack.observability.obltNav.infrastructure', {
          defaultMessage: 'Infrastructure',
        }),
        renderAs: 'panelOpener',
        icon: 'productCloudInfra',
        children: [
          {
            children: [
              {
                link: 'metrics:inventory',
                title: i18n.translate('xpack.observability.infrastructure.inventory', {
                  defaultMessage: 'Infrastructure inventory',
                }),
                getIsActive: ({ pathNameSerialized, prepend }) => {
                  return pathNameSerialized.startsWith(prepend('/app/metrics/inventory'));
                },
              },
              {
                link: 'metrics:hosts',
                getIsActive: ({ pathNameSerialized, prepend }) => {
                  return pathNameSerialized.startsWith(prepend('/app/metrics/hosts'));
                },
              },
              {
                link: 'metrics:metrics-explorer',
                title: i18n.translate(
                  'xpack.observability.obltNav.infrastructure.metricsExplorer',
                  {
                    defaultMessage: 'Metrics explorer',
                  }
                ),
              },
            ],
          },
          {
            id: 'profiling',
            title: i18n.translate('xpack.observability.obltNav.infrastructure.universalProfiling', {
              defaultMessage: 'Universal Profiling',
            }),
            children: [
              {
                link: 'profiling:stacktraces',
              },
              {
                link: 'profiling:flamegraphs',
              },
              {
                link: 'profiling:functions',
              },
            ],
          },
        ],
      },
      ...(showAiAssistant
        ? [
            {
              id: 'aiAssistantContainer',
              title: i18n.translate('xpack.observability.obltNav.aiAssistant', {
                defaultMessage: 'AI Assistant',
              }),
              icon: 'sparkles',
              link: 'observabilityAIAssistant' as const,
            },
          ]
        : [
            {
              link: 'agent_builder' as const,
              icon: 'productAgent',
            },
          ]),
      {
        id: 'machine_learning-landing',
        title: i18n.translate('xpack.observability.obltNav.machineLearning', {
          defaultMessage: 'Machine Learning',
        }),
        renderAs: 'panelOpener',
        icon: 'productML',
        children: [
          {
            title: '',
            children: [
              {
                link: 'ml:overview',
              },
              {
                link: 'ml:dataVisualizer',
              },
              {
                link: 'ml:dataDrift',
                sideNavStatus: 'hidden',
              },
              {
                link: 'ml:dataDriftPage',
                sideNavStatus: 'hidden',
              },
              {
                link: 'ml:fileUpload',
                sideNavStatus: 'hidden',
              },
              {
                link: 'ml:indexDataVisualizer',
                sideNavStatus: 'hidden',
              },
              {
                link: 'ml:indexDataVisualizerPage',
                sideNavStatus: 'hidden',
              },
            ],
          },
          {
            id: 'category-anomaly_detection',
            title: i18n.translate('xpack.observability.obltNav.ml.anomaly_detection', {
              defaultMessage: 'Anomaly detection',
            }),
            breadcrumbStatus: 'hidden',
            children: [
              {
                link: 'management:anomaly_detection',
                title: i18n.translate(
                  'xpack.observability.obltNav.ml.anomaly_detection.manage_jobs',
                  {
                    defaultMessage: 'Manage jobs',
                  }
                ),
              },
              {
                link: 'ml:anomalyExplorer',
              },
              {
                link: 'ml:singleMetricViewer',
              },
            ],
          },
          {
            id: 'category-data_frame analytics',
            title: i18n.translate('xpack.observability.obltNav.ml.data_frame_analytics', {
              defaultMessage: 'Data frame analytics',
            }),
            breadcrumbStatus: 'hidden',
            children: [
              {
                link: 'ml:resultExplorer',
              },
              {
                link: 'ml:analyticsMap',
              },
            ],
          },
          {
            id: 'category-aiops_labs',
            title: i18n.translate('xpack.observability.obltNav.ml.aiops_labs', {
              defaultMessage: 'AIOps Labs',
            }),
            breadcrumbStatus: 'hidden',
            children: [
              {
                link: 'ml:logRateAnalysis',
              },
              {
                link: 'ml:logRateAnalysisPage',
                sideNavStatus: 'hidden',
              },
              {
                link: 'ml:logPatternAnalysis',
              },
              {
                link: 'ml:logPatternAnalysisPage',
                sideNavStatus: 'hidden',
              },
              {
                link: 'ml:changePointDetections',
              },
              {
                link: 'ml:changePointDetectionsPage',
                sideNavStatus: 'hidden',
              },
            ],
          },
        ],
      },
      {
        id: 'otherTools',
        title: i18n.translate('xpack.observability.obltNav.otherTools', {
          defaultMessage: 'Other tools',
        }),
        renderAs: 'panelOpener',
        icon: 'wrench',
        children: [
          {
            link: 'logs:anomalies',
            title: i18n.translate('xpack.observability.obltNav.otherTools.logsAnomalies', {
              defaultMessage: 'Logs anomalies',
            }),
          },
          {
            link: 'logs:log-categories',
            title: i18n.translate('xpack.observability.obltNav.otherTools.logsCategories', {
              defaultMessage: 'Logs categories',
            }),
          },
          {
            link: 'maps',
            getIsActive: ({ pathNameSerialized, location, prepend }) =>
              !isEditingFromDashboard(location, pathNameSerialized, prepend) &&
              pathNameSerialized.includes('/app/maps'),
          },
          { link: 'graph' },
        ],
      },
    ],
    footer: [
      ingestHubAvailable
        ? {
            link: 'ingestHub' as const,
            title: i18n.translate('xpack.observability.obltNav.ingestHub', {
              defaultMessage: 'Ingest Hub',
            }),
            icon: 'launch',
            children: [
              {
                link: 'ingestHub' as const,
                title: i18n.translate('xpack.observability.obltNav.ingestHub.getStarted', {
                  defaultMessage: 'Get started',
                }),
              },
            ],
          }
        : {
            title: i18n.translate('xpack.observability.obltNav.addData', {
              defaultMessage: 'Add data',
            }),
            link: 'observabilityOnboarding' as const,
            icon: 'plusInCircle',
          },
      {
        id: 'devTools',
        title: i18n.translate('xpack.observability.obltNav.devTools', {
          defaultMessage: 'Developer tools',
        }),
        link: 'dev_tools',
        icon: 'code',
      },
      {
        id: DATA_MANAGEMENT_NAV_ID,
        title: i18n.translate('xpack.observability.obltNav.dataManagement', {
          defaultMessage: 'Data management',
          description: 'The heading of a section in a navigation tree dedicated to data collection',
        }),
        renderAs: 'panelOpener',
        icon: 'database',
        children: [
          {
            id: 'ingest_and_integrations',
            title: i18n.translate('xpack.observability.obltNav.ingestAndIntegrations', {
              defaultMessage: 'Ingest and integrations',
              description:
                'The heading of a section in a navigation tree dedicated to data collection',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                link: 'integrations',
              },
              {
                link: 'fleet',
              },
              {
                link: 'management:ingest_pipelines',
              },
              {
                link: 'management:pipelines',
              },
              {
                link: 'management:content_connectors',
              },
            ],
          },
          {
            id: 'indicesAndDataStreams',
            title: i18n.translate('xpack.observability.obltNav.indicesAndDataStreams', {
              defaultMessage: 'Indices and data streams',
              description:
                'Heading in a nav tree dedicated to UIs for leveraging various Elasticsearch features for data management',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                link: 'management:index_management',
              },
              {
                link: 'management:index_lifecycle_management',
              },
              {
                link: 'management:snapshot_restore',
              },
              {
                link: 'management:transform',
              },
              {
                link: 'management:rollup_jobs',
              },
              {
                link: 'management:data_quality',
              },
            ],
          },
        ],
      },
      {
        id: STACK_MANAGEMENT_NAV_ID,
        title: i18n.translate('xpack.observability.obltNav.management', {
          defaultMessage: 'Stack Management',
        }),
        icon: 'gear',
        breadcrumbStatus: 'hidden',
        renderAs: 'panelOpener',
        children: [
          {
            id: 'stack_management_home',
            title: '',
            renderAs: 'panelOpener',
            children: [
              {
                // We include this link here to ensure that the settings icon does not land on Stack Monitoring by default
                // https://github.com/elastic/kibana/issues/241518
                // And that the sidenav panel opens when user lands to legacy management landing page
                // https://github.com/elastic/kibana/issues/240275
                link: 'management',
                title: i18n.translate('xpack.observability.obltNav.management_home', {
                  defaultMessage: 'Home',
                }),
                breadcrumbStatus: 'hidden',
              },
              // Only show Cloud Connect in on-prem deployments (not cloud)
              ...(isCloudEnabled
                ? []
                : [
                    {
                      id: 'cloud_connect' as const,
                      link: 'cloud_connect' as const,
                    },
                  ]),
            ],
          },
          ...(showAlertingV2
            ? [
                {
                  id: 'v2_alerting_preview',
                  title: i18n.translate('xpack.observability.obltNav.v2AlertingPreview', {
                    defaultMessage: 'V2 Alerting Preview',
                  }),
                  renderAs: 'panelOpener' as const,
                  children: [
                    { link: 'management:rules' as const },
                    { link: 'management:episodes' as const },
                    { link: 'management:action_policies' as const },
                  ],
                },
              ]
            : []),
          {
            id: 'alerts_and_insights',
            title: i18n.translate('xpack.observability.obltNav.alertsAndInsights', {
              defaultMessage: 'Alerts and Insights',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                link: 'rules',
              },
              {
                link: 'management:triggersActionsConnectors',
              },
              {
                link: 'management:reporting',
              },
              {
                link: 'management:watcher',
              },
              {
                link: 'management:maintenanceWindows',
              },
            ],
          },
          {
            id: 'cluster_performance',
            title: i18n.translate('xpack.observability.obltNav.clusterPerformance', {
              defaultMessage: 'Cluster performance',
            }),
            children: [
              { link: 'monitoring' },
              {
                link: 'management:queryActivity',
                badgeType: 'new',
              },
            ],
          },
          {
            id: 'management_ml',
            title: i18n.translate('xpack.observability.obltNav.machineLearning', {
              defaultMessage: 'Machine Learning',
            }),
            children: [
              { link: 'management:overview' },
              { link: 'management:anomaly_detection' },
              { link: 'management:analytics' },
              { link: 'management:trained_models' },
              { link: 'management:supplied_configurations' },
            ],
          },
          {
            id: 'management_model_management',
            title: i18n.translate('xpack.observability.obltNav.modelManagement', {
              defaultMessage: 'Model Management',
            }),
            children: [
              { link: 'management:elastic_inference_service' },
              { link: 'management:inference_endpoints' },
              { link: 'management:model_settings' },
            ],
          },
          {
            id: 'management_ai',
            title: i18n.translate('xpack.observability.obltNav.ai', {
              defaultMessage: 'AI',
            }),
            children: [
              { link: 'management:genAiSettings' },
              { link: 'management:evals' },
              { link: 'management:aiAssistantManagementSelection' },
            ],
          },
          {
            id: 'security',
            title: i18n.translate('xpack.observability.obltNav.security', {
              defaultMessage: 'Security',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                link: 'management:users',
              },
              {
                link: 'management:roles',
              },
              {
                link: 'management:api_keys',
              },
              {
                link: 'management:role_mappings',
              },
            ],
          },
          {
            id: 'data',
            title: i18n.translate('xpack.observability.obltNav.data', {
              defaultMessage: 'Data',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                link: 'management:cross_cluster_replication',
              },
              {
                link: 'management:remote_clusters',
              },
            ],
          },
          {
            id: 'kibana',
            title: i18n.translate('xpack.observability.obltNav.kibana', {
              defaultMessage: 'Kibana',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                link: 'management:filesManagement',
              },
              {
                link: 'management:objects',
              },
              {
                link: 'management:tags',
              },
              {
                link: 'management:spaces',
              },
              {
                link: 'management:settings',
              },
              {
                link: 'management:dataViews',
              },
              {
                link: 'management:search_sessions',
              },
            ],
          },
        ],
      },
    ],
  };

  return navTree;
}

// Mirrors the constant declared in the Discover plugin
// (`src/platform/plugins/shared/discover/public/lab/entity_centric/constants.ts`).
// Inlined here to avoid a cross-plugin public-import that would couple the
// Observability nav to Discover's internals; the setting key is a stable
// public contract registered server-side in `discover/server/ui_settings.ts`.
// Single, mutually-exclusive lab-mode selector registered server-side in
// `discover/server/ui_settings.ts`. Inlined here to avoid a cross-plugin
// public import; the setting key is a stable public contract.
const LAB_MODE_SETTING = 'discover:labMode';
type LabMode = 'off' | 'entityCentric' | 'infraShortTerm' | 'superShortTerm';

export const createDefinition = (
  coreStart: CoreStart,
  pluginsStart: ObservabilityPublicPluginsStart
): AddSolutionNavigationArg => ({
  id: 'oblt',
  title,
  icon: 'logoObservability',
  navigationTree$: combineLatest([
    pluginsStart.streams?.navigationStatus$ || of({ status: 'disabled' as const }),
    coreStart.settings.client.get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE),
    pluginsStart.ingestHub?.navigationAvailable$ || of(false),
    coreStart.settings.client.get$<LabMode>(LAB_MODE_SETTING, 'off'),
    // Super-short-term lab: rebuild the integrations panel when the user stars,
    // unstars, or (re)groups an integration, or toggles nested-nav mode (store
    // lives in @kbn/entity-centric-lab-flyout, mirrored locally).
    getFavoritesState$(),
    getNestedNavEnabled$(),
    getIntegrationsSearch$(),
  ]).pipe(
    map(
      ([
        { status },
        chatExperience,
        ingestHubAvailable,
        labMode,
        favoritesState,
        nestedNavEnabled,
        integrationsSearchQuery,
      ]) =>
        createNavTree({
          streamsAvailable: status === 'enabled',
          showAiAssistant: chatExperience !== AIChatExperience.Agent,
          isCloudEnabled: pluginsStart.cloud?.isCloudEnabled,
          showAlertingV2: Boolean(coreStart.application.capabilities.alertingVTwo),
          ingestHubAvailable,
          entityCentricLabEnabled: labMode === 'entityCentric',
          infraShortTermEnabled: labMode === 'infraShortTerm',
          superShortTermEnabled: labMode === 'superShortTerm',
          favoritesState,
          nestedNavEnabled,
          integrationsSearchQuery,
          installedIntegrations: getInstalledIntegrations(),
          // Chrome requires nav `href`s to be absolute URLs; prepend the origin
          // to the basePath-qualified app path.
          toAbsoluteHref: (path: string) =>
            `${window.location.origin}${coreStart.http.basePath.prepend(path)}`,
        })
    )
  ),
});
