/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { ConsolePluginStart } from '@kbn/console-plugin/public';
import {
  AppMountParameters,
  CoreStart,
  CoreSetup,
  HttpSetup,
  Plugin,
  PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
  AppDeepLink,
  type AppUpdater,
  AppStatus,
} from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { i18n } from '@kbn/i18n';
import type { IndexManagementPluginStart } from '@kbn/index-management-shared-types';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '@kbn/search-api-panels/constants';
import { SearchConnectorsPluginStart } from '@kbn/search-connectors-plugin/public';
import { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/public';
import type { SearchNavigationPluginStart } from '@kbn/search-navigation/public';
import { SearchPlaygroundPluginStart } from '@kbn/search-playground/public';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';

import {
  ANALYTICS_PLUGIN,
  APPLICATIONS_PLUGIN,
  APP_SEARCH_PLUGIN,
  ELASTICSEARCH_PLUGIN,
  AI_SEARCH_PLUGIN,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  ENTERPRISE_SEARCH_OVERVIEW_PLUGIN,
  SEARCH_EXPERIENCES_PLUGIN,
  SEARCH_PRODUCT_NAME,
  VECTOR_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
  SEMANTIC_SEARCH_PLUGIN,
  SEARCH_RELEVANCE_PLUGIN,
} from '../common/constants';
import { registerLocators } from '../common/locators';
import { ClientConfigType, InitialAppData, ProductAccess } from '../common/types';
import { hasEnterpriseLicense } from '../common/utils/licensing';

import { ENGINES_PATH } from './applications/app_search/routes';
import { SEARCH_APPLICATIONS_PATH, PLAYGROUND_PATH } from './applications/applications/routes';
import {
  CONNECTORS_PATH,
  SEARCH_INDICES_PATH,
  CRAWLERS_PATH,
} from './applications/enterprise_search_content/routes';

import { INFERENCE_ENDPOINTS_PATH } from './applications/enterprise_search_relevance/routes';
import { docLinks } from './applications/shared/doc_links';
import type { DynamicSideNavItems } from './navigation_tree';

export interface ClientData extends InitialAppData {
  errorConnectingMessage?: string;
  publicUrl?: string;
}

export type EnterpriseSearchPublicSetup = ReturnType<EnterpriseSearchPlugin['setup']>;
export type EnterpriseSearchPublicStart = ReturnType<EnterpriseSearchPlugin['start']>;

interface PluginsSetup {
  cloud?: CloudSetup;
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginStart;
  security?: SecurityPluginSetup;
  share?: SharePluginSetup;
}

export interface PluginsStart {
  charts?: ChartsPluginStart;
  cloud?: CloudSetup & CloudStart;
  console?: ConsolePluginStart;
  data?: DataPublicPluginStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  indexManagement?: IndexManagementPluginStart;
  lens?: LensPublicStart;
  licensing?: LicensingPluginStart;
  ml?: MlPluginStart;
  navigation: NavigationPublicPluginStart;
  searchConnectors?: SearchConnectorsPluginStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  searchNavigation?: SearchNavigationPluginStart;
  searchPlayground?: SearchPlaygroundPluginStart;
  security?: SecurityPluginStart;
  share?: SharePluginStart;
}

export interface ESConfig {
  elasticsearch_host: string;
}

export type UpdateSideNavDefinitionFn = (items: Partial<DynamicSideNavItems>) => void;

const contentLinks: AppDeepLink[] = [
  {
    id: 'connectors',
    path: `/${CONNECTORS_PATH}`,
    title: i18n.translate('xpack.enterpriseSearch.navigation.contentConnectorsLinkLabel', {
      defaultMessage: 'Connectors',
    }),
  },
  {
    id: 'searchIndices',
    path: `/${SEARCH_INDICES_PATH}`,
    title: i18n.translate('xpack.enterpriseSearch.navigation.contentIndicesLinkLabel', {
      defaultMessage: 'Indices',
    }),
  },
  {
    id: 'webCrawlers',
    path: `/${CRAWLERS_PATH}`,
    title: i18n.translate('xpack.enterpriseSearch.navigation.contentWebcrawlersLinkLabel', {
      defaultMessage: 'Web Crawlers',
    }),
  },
];

const relevanceLinks: AppDeepLink[] = [
  {
    id: 'inferenceEndpoints',
    path: `/${INFERENCE_ENDPOINTS_PATH}`,
    title: i18n.translate(
      'xpack.enterpriseSearch.navigation.relevanceInferenceEndpointsLinkLabel',
      {
        defaultMessage: 'Inference Endpoints',
      }
    ),
    visibleIn: ['globalSearch'],
  },
];

const applicationsLinks: AppDeepLink[] = [
  {
    id: 'playground',
    path: `/${PLAYGROUND_PATH}`,
    title: i18n.translate('xpack.enterpriseSearch.navigation.contentPlaygroundLinkLabel', {
      defaultMessage: 'Playground',
    }),
    visibleIn: ['sideNav', 'globalSearch'],
  },
  {
    id: 'searchApplications',
    path: `/${SEARCH_APPLICATIONS_PATH}`,
    title: i18n.translate(
      'xpack.enterpriseSearch.navigation.applicationsSearchApplicationsLinkLabel',
      {
        defaultMessage: 'Search Applications',
      }
    ),
    visibleIn: ['globalSearch'],
  },
];

const appSearchLinks: AppDeepLink[] = [
  {
    id: 'engines',
    path: `/${ENGINES_PATH}`,
    title: i18n.translate('xpack.enterpriseSearch.navigation.appSearchEnginesLinkLabel', {
      defaultMessage: 'Engines',
    }),
  },
];

export class EnterpriseSearchPlugin implements Plugin {
  private config: ClientConfigType;
  private enterpriseLicenseAppUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
    this.esConfig = { elasticsearch_host: ELASTICSEARCH_URL_PLACEHOLDER };
  }

  private data: ClientData = {} as ClientData;
  private esConfig: ESConfig;

  private async getInitialData(http: HttpSetup) {
    try {
      this.esConfig = await http.get('/internal/enterprise_search/es_config');
    } catch {
      this.esConfig = { elasticsearch_host: ELASTICSEARCH_URL_PLACEHOLDER };
    }

    if (this.hasInitialized) return; // We've already made an initial call

    try {
      this.data = await http.get('/internal/enterprise_search/config_data');
      this.hasInitialized = true;
    } catch (e) {
      this.data.errorConnectingMessage = `${e.response.status} ${e.message}`;
    }
  }

  private async getKibanaDeps(
    core: CoreSetup,
    params: AppMountParameters,
    cloudSetup?: CloudSetup
  ) {
    // Helper for using start dependencies on mount (instead of setup dependencies)
    // and for grouping Kibana-related args together (vs. plugin-specific args)
    const [coreStart, pluginsStart] = await core.getStartServices();
    const cloud =
      cloudSetup && (pluginsStart as PluginsStart).cloud
        ? { ...cloudSetup, ...(pluginsStart as PluginsStart).cloud }
        : undefined;
    const plugins = { ...pluginsStart, cloud } as PluginsStart;

    const chromeStyle = await firstValueFrom(coreStart.chrome.getChromeStyle$());
    this.isSidebarEnabled = chromeStyle === 'classic';

    coreStart.chrome.getChromeStyle$().subscribe((style) => {
      this.isSidebarEnabled = style === 'classic';
    });

    return {
      core: coreStart,
      isSidebarEnabled: this.isSidebarEnabled,
      params,
      plugins,
      updateSideNavDefinition: this.updateSideNavDefinition.bind(this),
    };
  }

  private getPluginData() {
    // Small helper for grouping plugin data related args together
    return {
      config: this.config,
      data: this.data,
      esConfig: this.esConfig,
      isSidebarEnabled: this.isSidebarEnabled,
    };
  }

  private hasInitialized: boolean = false;
  private isSidebarEnabled = true;

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    const { config } = this;
    if (!config.ui?.enabled) {
      return;
    }
    const { cloud, share } = plugins;

    core.application.register({
      appRoute: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.LOGO,
      id: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.ID,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { EnterpriseSearchOverview } = await import(
          './applications/enterprise_search_overview'
        );

        return renderApp(EnterpriseSearchOverview, kibanaDeps, pluginData);
      },
      title: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.NAV_TITLE,
      visibleIn: ['home', 'kibanaOverview', 'globalSearch', 'sideNav'],
    });

    core.application.register({
      appRoute: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      deepLinks: contentLinks,
      euiIconType: ENTERPRISE_SEARCH_CONTENT_PLUGIN.LOGO,
      id: ENTERPRISE_SEARCH_CONTENT_PLUGIN.ID,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { EnterpriseSearchContent } = await import(
          './applications/enterprise_search_content'
        );

        return renderApp(EnterpriseSearchContent, kibanaDeps, pluginData);
      },
      title: ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAV_TITLE,
    });

    core.application.register({
      appRoute: ELASTICSEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.LOGO,
      id: ELASTICSEARCH_PLUGIN.ID,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(ELASTICSEARCH_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { Elasticsearch } = await import('./applications/elasticsearch');

        return renderApp(Elasticsearch, kibanaDeps, pluginData);
      },
      title: ELASTICSEARCH_PLUGIN.NAME,
    });

    core.application.register({
      appRoute: VECTOR_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: VECTOR_SEARCH_PLUGIN.LOGO,
      id: VECTOR_SEARCH_PLUGIN.ID,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(VECTOR_SEARCH_PLUGIN.NAME);

        this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { EnterpriseSearchVectorSearch } = await import('./applications/vector_search');

        return renderApp(EnterpriseSearchVectorSearch, kibanaDeps, pluginData);
      },
      title: VECTOR_SEARCH_PLUGIN.NAV_TITLE,
    });

    core.application.register({
      appRoute: SEMANTIC_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: SEMANTIC_SEARCH_PLUGIN.LOGO,
      id: SEMANTIC_SEARCH_PLUGIN.ID,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(SEMANTIC_SEARCH_PLUGIN.NAME);

        this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { EnterpriseSearchSemanticSearch } = await import('./applications/semantic_search');

        return renderApp(EnterpriseSearchSemanticSearch, kibanaDeps, pluginData);
      },
      title: SEMANTIC_SEARCH_PLUGIN.NAV_TITLE,
    });

    core.application.register({
      appRoute: AI_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: AI_SEARCH_PLUGIN.LOGO,
      id: AI_SEARCH_PLUGIN.ID,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(AI_SEARCH_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { EnterpriseSearchAISearch } = await import('./applications/ai_search');

        return renderApp(EnterpriseSearchAISearch, kibanaDeps, pluginData);
      },
      title: AI_SEARCH_PLUGIN.NAV_TITLE,
      visibleIn: [],
    });

    core.application.register({
      appRoute: APPLICATIONS_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      deepLinks: applicationsLinks,
      euiIconType: APPLICATIONS_PLUGIN.LOGO,
      id: APPLICATIONS_PLUGIN.ID,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { Applications } = await import('./applications/applications');

        return renderApp(Applications, kibanaDeps, pluginData);
      },
      title: APPLICATIONS_PLUGIN.NAV_TITLE,
      visibleIn: [],
    });

    core.application.register({
      appRoute: ANALYTICS_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.LOGO,
      id: ANALYTICS_PLUGIN.ID,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(ANALYTICS_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { Analytics } = await import('./applications/analytics');

        return renderApp(Analytics, kibanaDeps, pluginData);
      },
      title: ANALYTICS_PLUGIN.NAME,
    });

    core.application.register({
      appRoute: SEARCH_RELEVANCE_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      deepLinks: relevanceLinks,
      euiIconType: SEARCH_RELEVANCE_PLUGIN.LOGO,
      id: SEARCH_RELEVANCE_PLUGIN.ID,
      status: AppStatus.inaccessible,
      updater$: this.enterpriseLicenseAppUpdater$,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(SEARCH_RELEVANCE_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { EnterpriseSearchRelevance } = await import(
          './applications/enterprise_search_relevance'
        );

        return renderApp(EnterpriseSearchRelevance, kibanaDeps, pluginData);
      },
      title: SEARCH_RELEVANCE_PLUGIN.NAV_TITLE,
      visibleIn: [],
    });

    core.application.register({
      appRoute: SEARCH_EXPERIENCES_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      euiIconType: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.LOGO,
      id: SEARCH_EXPERIENCES_PLUGIN.ID,
      mount: async (params: AppMountParameters) => {
        const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
        const { chrome, http } = kibanaDeps.core;
        chrome.docTitle.change(SEARCH_EXPERIENCES_PLUGIN.NAME);

        await this.getInitialData(http);
        const pluginData = this.getPluginData();

        const { renderApp } = await import('./applications');
        const { SearchExperiences } = await import('./applications/search_experiences');

        return renderApp(SearchExperiences, kibanaDeps, pluginData);
      },
      title: SEARCH_EXPERIENCES_PLUGIN.NAME,
      visibleIn: [],
    });

    registerLocators(share!);

    if (config.canDeployEntSearch) {
      core.application.register({
        appRoute: APP_SEARCH_PLUGIN.URL,
        category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
        deepLinks: appSearchLinks,
        euiIconType: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.LOGO,
        id: APP_SEARCH_PLUGIN.ID,
        mount: async (params: AppMountParameters) => {
          const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
          const { chrome, http } = kibanaDeps.core;
          chrome.docTitle.change(APP_SEARCH_PLUGIN.NAME);

          await this.getInitialData(http);
          const pluginData = this.getPluginData();

          const { renderApp } = await import('./applications');
          const { AppSearch } = await import('./applications/app_search');

          return renderApp(AppSearch, kibanaDeps, pluginData);
        },
        title: APP_SEARCH_PLUGIN.NAME,
        visibleIn: [],
      });

      core.application.register({
        appRoute: WORKPLACE_SEARCH_PLUGIN.URL,
        category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
        euiIconType: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.LOGO,
        id: WORKPLACE_SEARCH_PLUGIN.ID,
        mount: async (params: AppMountParameters) => {
          const kibanaDeps = await this.getKibanaDeps(core, params, cloud);
          const { chrome, http } = kibanaDeps.core;
          chrome.docTitle.change(WORKPLACE_SEARCH_PLUGIN.NAME);

          // The Workplace Search Personal dashboard needs the chrome hidden. We hide it globally
          // here first to prevent a flash of chrome on the Personal dashboard and unhide it for admin routes.
          if (this.config.host) chrome.setIsVisible(false);
          await this.getInitialData(http);
          const pluginData = this.getPluginData();

          const { renderApp } = await import('./applications');
          const { WorkplaceSearch } = await import('./applications/workplace_search');

          return renderApp(WorkplaceSearch, kibanaDeps, pluginData);
        },
        title: WORKPLACE_SEARCH_PLUGIN.NAME,
        visibleIn: [],
      });
    }

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
        description: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.DESCRIPTION,
        icon: 'logoEnterpriseSearch',
        id: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.ID,
        order: 100,
        path: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL,
        title: SEARCH_PRODUCT_NAME,
      });

      plugins.home.featureCatalogue.register({
        category: 'data',
        description: ANALYTICS_PLUGIN.DESCRIPTION,
        icon: 'appAnalytics',
        id: ANALYTICS_PLUGIN.ID,
        path: ANALYTICS_PLUGIN.URL,
        showOnHomePage: false,
        title: ANALYTICS_PLUGIN.NAME,
      });

      if (config.canDeployEntSearch) {
        plugins.home.featureCatalogue.register({
          category: 'data',
          description: APP_SEARCH_PLUGIN.DESCRIPTION,
          icon: 'appSearchApp',
          id: APP_SEARCH_PLUGIN.ID,
          path: APP_SEARCH_PLUGIN.URL,
          showOnHomePage: false,
          title: APP_SEARCH_PLUGIN.NAME,
        });

        plugins.home.featureCatalogue.register({
          category: 'data',
          description: WORKPLACE_SEARCH_PLUGIN.DESCRIPTION,
          icon: 'workplaceSearchApp',
          id: WORKPLACE_SEARCH_PLUGIN.ID,
          path: WORKPLACE_SEARCH_PLUGIN.URL,
          showOnHomePage: false,
          title: WORKPLACE_SEARCH_PLUGIN.NAME,
        });
      }

      plugins.home.featureCatalogue.register({
        category: 'data',
        description: ELASTICSEARCH_PLUGIN.DESCRIPTION,
        icon: 'appElasticsearch',
        id: ELASTICSEARCH_PLUGIN.ID,
        path: ELASTICSEARCH_PLUGIN.URL,
        showOnHomePage: false,
        title: ELASTICSEARCH_PLUGIN.NAME,
      });

      plugins.home.featureCatalogue.register({
        category: 'data',
        description: SEARCH_EXPERIENCES_PLUGIN.DESCRIPTION,
        icon: 'logoEnterpriseSearch',
        id: SEARCH_EXPERIENCES_PLUGIN.ID,
        path: SEARCH_EXPERIENCES_PLUGIN.URL,
        showOnHomePage: false,
        title: SEARCH_EXPERIENCES_PLUGIN.NAME,
      });
    }
  }

  private readonly sideNavDynamicItems$ = new BehaviorSubject<DynamicSideNavItems>({});

  public start(core: CoreStart, plugins: PluginsStart) {
    if (!this.config.ui?.enabled) {
      return;
    }
    // This must be called here in start() and not in `applications/index.tsx` to prevent loading
    // race conditions with our apps' `routes.ts` being initialized before `renderApp()`
    docLinks.setDocLinks(core.docLinks);

    import('./navigation_tree').then(({ getNavigationTreeDefinition }) => {
      return plugins.navigation.addSolutionNavigation(
        getNavigationTreeDefinition({
          dynamicItems$: this.sideNavDynamicItems$,
        })
      );
    });
    if (plugins.searchNavigation !== undefined) {
      // while we have ent-search apps in the side nav, we need to provide access
      // to the base set of classic side nav items to the search-navigation plugin.
      import('./applications/shared/layout/base_nav').then(({ buildBaseClassicNavItems }) => {
        plugins.searchNavigation?.setGetBaseClassicNavItems(() => {
          const productAccess: ProductAccess = this.data?.access ?? {
            hasAppSearchAccess: false,
            hasWorkplaceSearchAccess: false,
          };

          return buildBaseClassicNavItems({ productAccess });
        });
      });

      // This is needed so that we can fetch product access for plugins
      // that need to share the classic nav. This can be removed when we
      // remove product access and ent-search apps.
      plugins.searchNavigation.registerOnAppMountHandler(async () => {
        return this.getInitialData(core.http);
      });
    }

    plugins.licensing?.license$.subscribe((license) => {
      if (hasEnterpriseLicense(license)) {
        this.enterpriseLicenseAppUpdater$.next(() => ({
          status: AppStatus.accessible,
        }));
      } else {
        this.enterpriseLicenseAppUpdater$.next(() => ({
          status: AppStatus.inaccessible,
        }));
      }
    });

    // Return empty start contract rather than void in order for plugins
    // that depend on the enterprise search plugin to determine whether it is enabled or not
    return {};
  }

  public stop() {}

  private updateSideNavDefinition = (items: Partial<DynamicSideNavItems>) => {
    this.sideNavDynamicItems$.next({ ...this.sideNavDynamicItems$.getValue(), ...items });
  };
}
