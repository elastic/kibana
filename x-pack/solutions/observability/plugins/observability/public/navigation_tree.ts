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
  getSavedViews$,
  type FavoritesState,
  type IntegrationSummary,
  type NavSavedView,
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
  latestEnabled,
  elasticOnEnabled,
  infraShortTermEnabled,
  superShortTermEnabled,
  favoritesState = { ungrouped: [], groups: [] },
  nestedNavEnabled = false,
  installedIntegrations = [],
  integrationsSearchQuery = '',
  savedViews = [],
  toAbsoluteHref = (path: string) => path,
}: {
  streamsAvailable?: boolean;
  showAiAssistant?: boolean;
  isCloudEnabled?: boolean;
  showAlertingV2?: boolean;
  ingestHubAvailable?: boolean;
  entityCentricLabEnabled?: boolean;
  // `latest` is a variant of the entity-centric lab (it flows through the same
  // `entityCentricLabEnabled` branch) but renames the panel to "Inventory" and
  // adds a "Saved views" section. Never affects any other mode.
  latestEnabled?: boolean;
  // `elasticOn` is a clone of `latest` (so `latestEnabled` is also true for it):
  // it inherits the whole Latest inventory experience, and then layers on
  // ElasticOn-only changes gated behind this exclusive flag. Never affects Latest
  // or any other mode. First ElasticOn-only change: the inventory is hosted under
  // the "Infrastructure" nav item (replacing its default children) instead of a
  // separate "Inventory" item.
  elasticOnEnabled?: boolean;
  infraShortTermEnabled?: boolean;
  superShortTermEnabled?: boolean;
  favoritesState?: FavoritesState;
  nestedNavEnabled?: boolean;
  installedIntegrations?: readonly IntegrationSummary[];
  // Latest lab: named entity-inventory views surfaced in the panel.
  savedViews?: readonly NavSavedView[];
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

  // ElasticOn hosts the inventory under the "Infrastructure" nav item, so the
  // panel is titled "Infrastructure". Latest renames it to "Inventory" (it's the
  // entity inventory hub with saved views); the other infra modes keep
  // "Infrastructure"; entity-centric keeps "Entities". (ElasticOn implies
  // `latestEnabled`, so it must be checked first.)
  const entitiesPanelTitle = elasticOnEnabled
    ? i18n.translate('xpack.observability.obltNav.infrastructure', {
        defaultMessage: 'Infrastructure',
      })
    : latestEnabled
    ? i18n.translate('xpack.observability.obltNav.inventory', {
        defaultMessage: 'Inventory',
      })
    : infraPanelMode
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
  // only to integration items; the "Overview" link always stays visible so the
  // panel never empties. The search box is always shown (independent of the
  // grouped-favorites toggle), so the query applies whenever it's non-empty.
  const normalizedQuery = integrationsSearchQuery.trim().toLowerCase();
  const matchesQuery = (integration: IntegrationSummary): boolean =>
    normalizedQuery.length === 0 || integration.name.toLowerCase().includes(normalizedQuery);
  const filterByQuery = (integrations: IntegrationSummary[]): IntegrationSummary[] =>
    integrations.filter(matchesQuery);

  // Latest lab reuses the same shared nav-search store (the modes are mutually
  // exclusive). Here it filters, by label, both the "Saved views" list and the
  // category items. Generic string matcher so it can be applied to either.
  const matchesLatestSearch = (label: string): boolean =>
    normalizedQuery.length === 0 || label.toLowerCase().includes(normalizedQuery);

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
              defaultMessage: 'Favorites',
            }),
            children: starredSectionChildren,
          },
        ]
      : []),
    {
      // Intentionally title-less: the mock shows this second section unlabeled
      // (a plain divider separates it from "Favorites"). A section node with no
      // `title` renders no header row in the chrome side-nav mapper.
      id: 'entityCentricLab-allIntegrations',
      // "Overview" spans every installed integration, so it heads this list
      // rather than living under "Favorites". Starred integrations are shown only
      // in the section above, not duplicated here.
      children: [
        {
          id: 'entityCentricLab-integrationsOverview',
          link: 'streams:integrations' as const,
          title: i18n.translate('xpack.observability.obltNav.integrations.overview', {
            defaultMessage: 'Overview',
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

  // Latest lab: named entity-inventory views render as a "Saved views" section
  // at the top of the panel. Each links to its target category route with the
  // view id encoded (`?loadView=<id>`) so the destination page self-applies the
  // saved filters / layout on arrival — chrome nav items are href-only and
  // can't run the apply logic themselves. Uses an absolute href because the
  // view id is dynamic (no static deep link exists). Hidden when there are no
  // views, to avoid an empty section header.
  // Filter the saved views by the panel search query (Latest only).
  const filteredSavedViews = savedViews.filter((view) => matchesLatestSearch(view.name));
  // ElasticOn: surface the session-landing default first and mark it with a star
  // glyph. `latest` never sets a default, so leave its list untouched. (The star
  // survives the nav's sentence-case label formatter, which only touches the
  // first character.)
  const orderedSavedViews = elasticOnEnabled
    ? [...filteredSavedViews].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    : filteredSavedViews;
  const savedViewsSection =
    latestEnabled && orderedSavedViews.length > 0
      ? {
          id: 'entityCentricLab-savedViews',
          title: i18n.translate('xpack.observability.obltNav.savedViews', {
            defaultMessage: 'Saved views',
          }),
          children: orderedSavedViews.map((view) => {
            // Rebuild the exact route the view was saved on. Cloud views carry a
            // provider (and optionally a service) sub-scope, so a view saved on
            // `/entities/cloud/aws/s3` reloads that page — not the whole Cloud
            // category.
            let categorySegment = '';
            if (view.category === 'cloud' && view.cloudProvider) {
              categorySegment = view.cloudService
                ? `/cloud/${view.cloudProvider}/${view.cloudService}`
                : `/cloud/${view.cloudProvider}`;
            } else if (view.category) {
              categorySegment = `/${view.category}`;
            }
            const path = `/app/streams/entities${categorySegment}?loadView=${encodeURIComponent(
              view.id
            )}`;
            return {
              id: `entityCentricLab-savedView-${view.id}`,
              href: toAbsoluteHref(path),
              title: elasticOnEnabled && view.isDefault ? `\u2605 ${view.name}` : view.name,
              // Active when the page URL still carries this view's `loadView`
              // id. The streams page keeps the param (rather than stripping it)
              // precisely so the loaded view stays highlighted here and survives
              // a refresh. href-only nodes need explicit param typing.
              getIsActive: ({ location }: { location: Location }) =>
                new URLSearchParams(location.search).get('loadView') === view.id,
            };
          }),
        }
      : null;

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

  // Latest: while a saved view is loaded (`?loadView` present) the highlighted
  // item should be the saved view, not the category page it happens to open on.
  // Category nodes rely on default deep-link URL matching, which would light up
  // e.g. "Kubernetes" alongside the view — so in Latest we give them an explicit
  // getIsActive that yields to the saved view (returns false) whenever a view is
  // loaded, and otherwise reproduces the normal path match. Scoped to Latest;
  // the other entity-centric modes keep the standard nodes untouched.
  const isLoadingSavedView = (location: Location): boolean =>
    new URLSearchParams(location.search).get('loadView') !== null;

  const categoryGetIsActive =
    (appPath: string, exact = false) =>
    ({
      pathNameSerialized,
      prepend,
      location,
    }: {
      pathNameSerialized: string;
      prepend: (path: string) => string;
      location: Location;
    }): boolean => {
      if (isLoadingSavedView(location)) return false;
      const target = prepend(appPath);
      // "All entities" (`/entities`) is a prefix of every category route, so it
      // must match exactly; the distinct category segments can use `startsWith`.
      return exact
        ? pathNameSerialized === target || pathNameSerialized === `${target}/`
        : pathNameSerialized.startsWith(target);
    };

  // Latest: keep the "Inventory" panel opener active for *any* entities route,
  // independent of its children. The panel search (and the "manage saved views"
  // delete) can filter out the category item matching the current page; without
  // this, the panel would be left with no active node and the highlight would
  // fall through to the broader "Streams" item (which also matches
  // `/app/streams`), reading as being bounced from Inventory to Streams.
  const latestEntitiesPanelGetIsActive = ({
    pathNameSerialized,
    prepend,
  }: {
    pathNameSerialized: string;
    prepend: (path: string) => string;
  }): boolean =>
    pathNameSerialized.startsWith(prepend('/app/streams/entities')) ||
    // "Manage entity types" is reached from the inventory toolbar and lives in
    // this panel too, so keep the panel highlighted there instead of letting the
    // route fall through to the Streams opener (which also matches `/app/streams`).
    pathNameSerialized.startsWith(prepend('/app/streams/manage-entity-types'));

  // Latest category nodes carry an explicit title (identical to their deep-link
  // title) so the panel search can filter them against the same string that's
  // displayed. Titles/filtering are Latest-only; the entity-centric nodes above
  // are untouched.
  const latestEntitiesAllSection = {
    children: [
      {
        id: 'entityCentricLab-entitiesAll',
        link: 'streams:entitiesAll' as const,
        title: i18n.translate('xpack.observability.obltNav.latest.allEntities', {
          defaultMessage: 'All entities',
        }),
        getIsActive: categoryGetIsActive('/app/streams/entities', true),
      },
    ].filter((child) => matchesLatestSearch(child.title)),
  };

  // Latest categories render as a flat, untitled group — but Cloud is pulled out
  // into its own collapsible section (see `latestCloudSection`) and slotted back
  // into its original position (after Services) by splitting the list in two.
  const latestCategoryChildrenTop = [
    {
      id: 'entityCentricLab-entitiesHosts',
      link: 'streams:entitiesHosts' as const,
      title: i18n.translate('xpack.observability.obltNav.latest.hosts', {
        defaultMessage: 'Hosts',
      }),
      getIsActive: categoryGetIsActive('/app/streams/entities/hosts'),
    },
    {
      id: 'entityCentricLab-entitiesKubernetes',
      link: 'streams:entitiesKubernetes' as const,
      title: i18n.translate('xpack.observability.obltNav.latest.kubernetes', {
        defaultMessage: 'Kubernetes',
      }),
      getIsActive: categoryGetIsActive('/app/streams/entities/kubernetes'),
    },
    {
      id: 'entityCentricLab-entitiesDatabases',
      link: 'streams:entitiesDatabases' as const,
      title: i18n.translate('xpack.observability.obltNav.latest.databases', {
        defaultMessage: 'Databases',
      }),
      getIsActive: categoryGetIsActive('/app/streams/entities/databases'),
    },
    {
      id: 'entityCentricLab-entitiesServices',
      link: 'streams:entitiesServices' as const,
      title: i18n.translate('xpack.observability.obltNav.latest.services', {
        defaultMessage: 'Services',
      }),
      getIsActive: categoryGetIsActive('/app/streams/entities/services'),
    },
  ].filter((child) => matchesLatestSearch(child.title));

  const latestCategoryChildrenBottom = [
    {
      id: 'entityCentricLab-entitiesMiddlewares',
      link: 'streams:entitiesMiddlewares' as const,
      title: i18n.translate('xpack.observability.obltNav.latest.middlewares', {
        defaultMessage: 'Middlewares',
      }),
      getIsActive: categoryGetIsActive('/app/streams/entities/middlewares'),
    },
    {
      id: 'entityCentricLab-entitiesLlms',
      link: 'streams:entitiesLlms' as const,
      title: i18n.translate('xpack.observability.obltNav.latest.llms', {
        defaultMessage: 'LLMs',
      }),
      getIsActive: categoryGetIsActive('/app/streams/entities/llms'),
    },
    {
      id: 'entityCentricLab-entitiesOther',
      link: 'streams:entitiesOther' as const,
      title: i18n.translate('xpack.observability.obltNav.latest.other', {
        defaultMessage: 'Other',
      }),
      getIsActive: categoryGetIsActive('/app/streams/entities/other'),
    },
  ].filter((child) => matchesLatestSearch(child.title));

  // Latest: Cloud is an inline, collapsible group *in the panel* (Cloud >
  // AWS/GCP/Azure > services) rather than a flyout panelOpener or an in-page
  // tree. The chrome mapper turns a titled section whose children are
  // link-less + childful nodes into sub-groups (the one supported nesting level),
  // so each provider becomes a collapsible sub-group of its service links.
  // Provider rows are headers only (no landing link); the services deep-link to
  // their pages. Search filters services by label (and shows a whole provider
  // when its name — or "Cloud" — matches).
  const latestCloudProviders = [
    {
      id: 'entityCentricLab-latestCloudAws',
      label: 'AWS',
      services: [
        {
          id: 'entityCentricLab-entitiesCloudAwsEc2',
          link: 'streams:entitiesCloudAwsEc2' as const,
          title: 'EC2',
          path: '/app/streams/entities/cloud/aws/ec2',
        },
        {
          id: 'entityCentricLab-entitiesCloudAwsLambda',
          link: 'streams:entitiesCloudAwsLambda' as const,
          title: 'Lambda',
          path: '/app/streams/entities/cloud/aws/lambda',
        },
        {
          id: 'entityCentricLab-entitiesCloudAwsS3',
          link: 'streams:entitiesCloudAwsS3' as const,
          title: 'S3',
          path: '/app/streams/entities/cloud/aws/s3',
        },
      ],
    },
    {
      id: 'entityCentricLab-latestCloudGcp',
      label: 'GCP',
      services: [
        {
          id: 'entityCentricLab-entitiesCloudGcpCompute',
          link: 'streams:entitiesCloudGcpCompute' as const,
          title: 'Compute Engine',
          path: '/app/streams/entities/cloud/gcp/compute',
        },
        {
          id: 'entityCentricLab-entitiesCloudGcpFunctions',
          link: 'streams:entitiesCloudGcpFunctions' as const,
          title: 'Cloud Functions',
          path: '/app/streams/entities/cloud/gcp/functions',
        },
        {
          id: 'entityCentricLab-entitiesCloudGcpStorage',
          link: 'streams:entitiesCloudGcpStorage' as const,
          title: 'Cloud Storage',
          path: '/app/streams/entities/cloud/gcp/storage',
        },
      ],
    },
    {
      id: 'entityCentricLab-latestCloudAzure',
      label: 'Azure',
      services: [
        {
          id: 'entityCentricLab-entitiesCloudAzureVm',
          link: 'streams:entitiesCloudAzureVm' as const,
          title: 'Virtual Machines',
          path: '/app/streams/entities/cloud/azure/vm',
        },
        {
          id: 'entityCentricLab-entitiesCloudAzureFunctions',
          link: 'streams:entitiesCloudAzureFunctions' as const,
          title: 'Functions',
          path: '/app/streams/entities/cloud/azure/functions',
        },
        {
          id: 'entityCentricLab-entitiesCloudAzureBlob',
          link: 'streams:entitiesCloudAzureBlob' as const,
          title: 'Blob Storage',
          path: '/app/streams/entities/cloud/azure/blob',
        },
      ],
    },
  ];

  const latestCloudTitle = i18n.translate('xpack.observability.obltNav.latest.cloud', {
    defaultMessage: 'Cloud',
  });
  const latestCloudSubGroups = latestCloudProviders
    .map((provider) => {
      const providerMatches =
        matchesLatestSearch(latestCloudTitle) || matchesLatestSearch(provider.label);
      const services = provider.services
        .filter((service) => providerMatches || matchesLatestSearch(service.title))
        .map((service) => ({
          id: service.id,
          link: service.link,
          title: service.title,
          getIsActive: categoryGetIsActive(service.path),
        }));
      // A childless, link-less node would be dropped by the mapper; skip empties.
      return { id: provider.id, title: provider.label, children: services };
    })
    .filter((provider) => provider.children.length > 0);

  const latestCloudSection =
    latestCloudSubGroups.length > 0
      ? {
          id: 'entityCentricLab-latestCloudSection',
          title: latestCloudTitle,
          children: latestCloudSubGroups,
        }
      : null;

  const manageEntityTypesSection = {
    // Duplicate of the Streams panel's "Manage entity types" entry: the same
    // route is reachable from both panels per the lab design.
    children: [
      {
        id: 'entityCentricLab-manage-fromEntities',
        link: 'streams:manageEntityTypes' as const,
      },
    ],
  };

  // Panel sections differ by mode. Entity-centric keeps the full category list
  // plus a "Manage entity types" shortcut. Latest adds the "Saved views" section
  // and gives the categories saved-view-aware highlighting. Infra-short-term
  // shows "All entities", the Cloud section (with AWS/GCP/Azure), then the
  // remaining flat categories (Databases, Kubernetes).
  // ElasticOn drops the dedicated "Cloud" section (label + surrounding dividers)
  // and folds AWS/GCP/Azure into the single flat category section. The chrome
  // mapper renders flat links first and collapsible sub-groups last within a
  // section, so the providers land at the bottom of the category list with no
  // dividers bracketing them.
  const elasticOnCategoryChildren = [
    ...latestCategoryChildrenTop,
    // ElasticOn-only: drop the "Other" catch-all category from the list.
    ...latestCategoryChildrenBottom.filter(
      (child) => child.id !== 'entityCentricLab-entitiesOther'
    ),
    ...latestCloudSubGroups,
  ];

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
    : elasticOnEnabled
    ? [
        // ElasticOn: Saved views, All entities, then a single category section
        // (flat categories + AWS/GCP/Azure collapsible groups, no "Cloud" label
        // or surrounding dividers), then Manage entity types.
        ...(savedViewsSection ? [savedViewsSection] : []),
        ...(latestEntitiesAllSection.children.length > 0 ? [latestEntitiesAllSection] : []),
        ...(elasticOnCategoryChildren.length > 0 ? [{ children: elasticOnCategoryChildren }] : []),
        manageEntityTypesSection,
      ]
    : latestEnabled
    ? [
        // Latest leads with the "Saved views" section (when non-empty), then
        // "All entities", the first category group, the collapsible "Cloud"
        // section (in its original ordinal spot), and the remaining categories.
        // The search box can filter any of these down to nothing, so only
        // include groups/sections that still have children — an empty group
        // would render a stray container. "Manage entity types" always stays
        // (it isn't a category).
        ...(savedViewsSection ? [savedViewsSection] : []),
        ...(latestEntitiesAllSection.children.length > 0 ? [latestEntitiesAllSection] : []),
        ...(latestCategoryChildrenTop.length > 0 ? [{ children: latestCategoryChildrenTop }] : []),
        ...(latestCloudSection ? [latestCloudSection] : []),
        ...(latestCategoryChildrenBottom.length > 0
          ? [{ children: latestCategoryChildrenBottom }]
          : []),
        manageEntityTypesSection,
      ]
    : [
        entitiesAllSection,
        {
          children: entityCentricCategoryChildren,
        },
        manageEntityTypesSection,
      ];

  // Universal Profiling stays available under the "Infrastructure" item in every
  // mode. Extracted so ElasticOn can append it beneath the relocated inventory
  // content while the default Infrastructure panel keeps it in place.
  const universalProfilingSection = {
    id: 'profiling',
    title: i18n.translate('xpack.observability.obltNav.infrastructure.universalProfiling', {
      defaultMessage: 'Universal Profiling',
    }),
    children: [
      { link: 'profiling:stacktraces' as const },
      { link: 'profiling:flamegraphs' as const },
      { link: 'profiling:functions' as const },
    ],
  };

  // The default "Infrastructure" panel (used by every mode except ElasticOn):
  // the three infra touchpoints followed by Universal Profiling.
  const metricsInfrastructureNode = {
    id: 'metrics',
    link: 'metrics:inventory' as const,
    title: i18n.translate('xpack.observability.obltNav.infrastructure', {
      defaultMessage: 'Infrastructure',
    }),
    renderAs: 'panelOpener' as const,
    icon: 'productCloudInfra',
    children: [
      {
        children: [
          {
            link: 'metrics:inventory' as const,
            title: i18n.translate('xpack.observability.infrastructure.inventory', {
              defaultMessage: 'Infrastructure inventory',
            }),
            getIsActive: ({
              pathNameSerialized,
              prepend,
            }: {
              pathNameSerialized: string;
              prepend: (path: string) => string;
            }) => {
              return pathNameSerialized.startsWith(prepend('/app/metrics/inventory'));
            },
          },
          {
            link: 'metrics:hosts' as const,
            getIsActive: ({
              pathNameSerialized,
              prepend,
            }: {
              pathNameSerialized: string;
              prepend: (path: string) => string;
            }) => {
              return pathNameSerialized.startsWith(prepend('/app/metrics/hosts'));
            },
          },
          {
            link: 'metrics:metrics-explorer' as const,
            title: i18n.translate('xpack.observability.obltNav.infrastructure.metricsExplorer', {
              defaultMessage: 'Metrics explorer',
            }),
          },
        ],
      },
      universalProfilingSection,
    ],
  };

  // The entity inventory panel opener. It always keeps the node id `entities` so
  // the side-nav slot wiring (search box header + "manage saved views" cog) stays
  // bound to it regardless of where the panel is rendered. In ElasticOn it is the
  // "Infrastructure" item itself (infra icon, Universal Profiling appended); in
  // every other lab mode it is a separate item with the generic entity `cluster`
  // icon.
  const inventoryPanelNode = {
    id: 'entities',
    // Super-short-term lands on the starred integrations Overview; the other lab
    // modes land on the "All entities" inventory.
    link: superShortTermMode ? ('streams:integrations' as const) : ('streams:entitiesAll' as const),
    // `cluster` reads as "connected things / a network of entities" — the closest
    // generic-entity metaphor in the current EUI icon set. ElasticOn hosts the
    // inventory under "Infrastructure", so it uses the infra icon instead.
    icon: elasticOnEnabled ? 'productCloudInfra' : 'cluster',
    title: entitiesPanelTitle,
    renderAs: 'panelOpener' as const,
    // Latest (and its ElasticOn clone): pin the panel active across all entities
    // routes so a search/delete that hides the current category doesn't hand the
    // highlight to Streams. Other modes keep default matching.
    ...(latestEnabled ? { getIsActive: latestEntitiesPanelGetIsActive } : {}),
    // ElasticOn relocates the inventory under "Infrastructure" and keeps
    // Universal Profiling beneath the category list.
    children: elasticOnEnabled
      ? [...entitiesPanelChildren, universalProfilingSection]
      : entitiesPanelChildren,
  };

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
      // Entity-centric / Infra-short-term / Latest labs: a top-level inventory
      // panel that sits above Streams so the user lands on it first. ElasticOn is
      // the exception — it hosts the same inventory under the "Infrastructure"
      // item instead (see below), so this separate item is omitted there.
      ...(showEntitiesPanel && !elasticOnEnabled ? [inventoryPanelNode] : []),
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
                  // Latest/ElasticOn: entities routes belong to the Inventory /
                  // Infrastructure panel, not Streams. The opener defaults to
                  // matching any `/app/streams` route (which includes
                  // `/entities`), so without this exclusion Streams claims the
                  // highlight whenever the inventory panel is left with no active
                  // child — e.g. after a saved view is deleted or filtered out.
                  // In ElasticOn the inventory panel sits *after* Streams in the
                  // body, so that stray level-1 match would otherwise win.
                  getIsActive: ({
                    pathNameSerialized,
                    prepend,
                  }: {
                    pathNameSerialized: string;
                    prepend: (path: string) => string;
                  }) => {
                    const root = prepend('/app/streams');
                    if (!pathNameSerialized.startsWith(root)) return false;
                    if (
                      latestEnabled &&
                      (pathNameSerialized.startsWith(`${root}/entities`) ||
                        // "Manage entity types" belongs to the Inventory /
                        // Infrastructure panel in these modes (it's reached from
                        // the inventory toolbar); don't let Streams claim it.
                        pathNameSerialized.startsWith(`${root}/manage-entity-types`))
                    ) {
                      return false;
                    }
                    return true;
                  },
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
                                !pathNameSerialized.startsWith(`${root}/significant-events`) &&
                                // Latest: `/entities` is the Inventory panel's own
                                // territory. Without this, "All streams" claims it
                                // as active — so when the panel search hides the
                                // current category, this (deeper) match wins and
                                // the highlight jumps to the Streams panel.
                                !(
                                  latestEnabled && pathNameSerialized.startsWith(`${root}/entities`)
                                ))
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
                    // "Manage entity types" is duplicated in the Streams panel and
                    // the entity Inventory / Infrastructure panel. In Latest/ElasticOn
                    // the route belongs to the inventory panel (reached from its
                    // toolbar), so the Streams copy is dropped — otherwise this child
                    // matches `/manage-entity-types` by default and keeps the Streams
                    // panel active/displayed there. Entity-centric keeps it here.
                    ...(latestEnabled
                      ? []
                      : [
                          {
                            children: [
                              {
                                id: 'entityCentricLab-manage',
                                link: 'streams:manageEntityTypes' as const,
                              },
                            ],
                          },
                        ]),
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
      // The "Infrastructure" item. ElasticOn replaces its default children
      // (Infrastructure inventory / Hosts / Metrics explorer) with the full
      // entity inventory panel — same node, still id `entities` so the search +
      // saved-views slots keep working — and appends Universal Profiling beneath
      // it. Every other mode keeps the default Infrastructure panel. When streams
      // isn't available the inventory can't be hosted, so fall back to the
      // default panel.
      elasticOnEnabled && showEntitiesPanel ? inventoryPanelNode : metricsInfrastructureNode,
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
type LabMode =
  | 'off'
  | 'entityCentric'
  | 'latest'
  | 'elasticOn'
  | 'infraShortTerm'
  | 'superShortTerm';

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
    // Latest lab: rebuild the "Saved views" section whenever the user saves,
    // renames, or deletes a view (store lives in streams_app, mirrored here).
    getSavedViews$(),
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
        savedViews,
      ]) =>
        createNavTree({
          streamsAvailable: status === 'enabled',
          showAiAssistant: chatExperience !== AIChatExperience.Agent,
          isCloudEnabled: pluginsStart.cloud?.isCloudEnabled,
          showAlertingV2: Boolean(coreStart.application.capabilities.alertingVTwo),
          ingestHubAvailable,
          // `latest` (and its `elasticOn` clone) reuse the entity-centric panel
          // but with Latest-only tweaks (see `latestEnabled` below).
          entityCentricLabEnabled:
            labMode === 'entityCentric' || labMode === 'latest' || labMode === 'elasticOn',
          latestEnabled: labMode === 'latest' || labMode === 'elasticOn',
          elasticOnEnabled: labMode === 'elasticOn',
          infraShortTermEnabled: labMode === 'infraShortTerm',
          superShortTermEnabled: labMode === 'superShortTerm',
          favoritesState,
          nestedNavEnabled,
          integrationsSearchQuery,
          savedViews,
          installedIntegrations: getInstalledIntegrations(),
          // Chrome requires nav `href`s to be absolute URLs; prepend the origin
          // to the basePath-qualified app path.
          toAbsoluteHref: (path: string) =>
            `${window.location.origin}${coreStart.http.basePath.prepend(path)}`,
        })
    )
  ),
});
