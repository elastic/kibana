/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Subject, combineLatestWith } from 'rxjs';
import type * as H from 'history';
import type {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Plugin as IPlugin,
} from '@kbn/core/public';
import { AppStatus, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { uiMetricService } from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import type {
  SecuritySolutionAppWrapperFeature,
  SecuritySolutionCellRendererFeature,
} from '@kbn/discover-shared-plugin/public/services/discover_features';
import { getLazyCloudSecurityPosturePliAuthBlockExtension } from './cloud_security_posture/lazy_cloud_security_posture_pli_auth_block_extension';
import { getLazyEndpointAgentTamperProtectionExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_agent_tamper_protection_extension';
import type {
  PluginSetup,
  PluginStart,
  SetupPlugins,
  StartPlugins,
  StartServices,
  SubPlugins,
  StartedSubPlugins,
  StartPluginsDependencies,
} from './types';
import { SOLUTION_NAME, ASSISTANT_MANAGEMENT_TITLE } from './common/translations';

import { APP_ID, APP_UI_ID, APP_PATH, APP_ICON_SOLUTION } from '../common/constants';

import type { AppLinkItems } from './common/links';
import { updateAppLinks, type LinksPermissions } from './common/links';
import { registerDeepLinksUpdater } from './common/links/deep_links';
import type { FleetUiExtensionGetterOptions, SecuritySolutionUiConfigType } from './common/types';

import { getLazyEndpointPolicyEditExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_edit_extension';
import { getLazyEndpointPolicyCreateExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_create_extension';
import { LazyEndpointPolicyCreateMultiStepExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_create_multi_step_extension';
import { getLazyEndpointPackageCustomExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_package_custom_extension';
import { getLazyEndpointPolicyResponseExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_policy_response_extension';
import { getLazyEndpointGenericErrorsListExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_generic_errors_list';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import { LazyEndpointCustomAssetsExtension } from './management/pages/policy/view/ingest_manager_integration/lazy_endpoint_custom_assets_extension';
import { LazyCustomCriblExtension } from './security_integrations/cribl/components/lazy_custom_cribl_extension';

import type { SecurityAppStore } from './common/store/types';
import { PluginContract } from './plugin_contract';
import { PluginServices } from './plugin_services';
import { getExternalReferenceAttachmentEndpointRegular } from './cases/attachments/external_reference';
import { hasAccessToSecuritySolution } from './helpers_access';

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private config: SecuritySolutionUiConfigType;
  private experimentalFeatures: ExperimentalFeatures;
  private contract: PluginContract;
  private services: PluginServices;

  private appUpdater$ = new Subject<AppUpdater>();
  private storage = new Storage(localStorage);

  // Lazily instantiated dependencies
  private _subPlugins?: SubPlugins;
  private _store?: SecurityAppStore;
  private _securityStoreForDiscover?: SecurityAppStore;
  private _actionsRegistered?: boolean = false;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<SecuritySolutionUiConfigType>();
    this.experimentalFeatures = parseExperimentalConfigValue(
      this.config.enableExperimental || []
    ).features;
    this.contract = new PluginContract(this.experimentalFeatures);

    this.services = new PluginServices(
      this.config,
      this.experimentalFeatures,
      this.contract,
      initializerContext.env.packageInfo
    );
  }

  public setup(
    core: CoreSetup<StartPluginsDependencies, PluginStart>,
    plugins: SetupPlugins
  ): PluginSetup {
    this.services.setup(core, plugins);

    const { home, usageCollection, management, cases } = plugins;

    // Lazily instantiate subPlugins and initialize services
    const mountDependencies = async (params?: AppMountParameters) => {
      const { renderApp } = await this.lazyApplicationDependencies();
      const [coreStart, startPlugins] = await core.getStartServices();

      const subPlugins = await this.startSubPlugins(this.storage, coreStart, startPlugins);
      const store = await this.store(coreStart, startPlugins, subPlugins);

      const services = await this.services.generateServices(coreStart, startPlugins, params);
      return { renderApp, subPlugins, store, services };
    };

    // register cloud security ui metrics
    if (plugins.usageCollection) uiMetricService.setup(plugins.usageCollection);

    // Register main Security Solution plugin
    core.application.register({
      id: APP_UI_ID,
      title: SOLUTION_NAME,
      appRoute: APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      updater$: this.appUpdater$,
      visibleIn: ['globalSearch', 'home', 'kibanaOverview'],
      euiIconType: APP_ICON_SOLUTION,
      mount: async (params) => {
        const { renderApp, services, store, subPlugins } = await mountDependencies(params);
        const { getSubPluginRoutesByCapabilities } = await this.lazyHelpersForRoutes();

        await this.registerActions(store, params.history, core, services);

        const subPluginRoutes = getSubPluginRoutesByCapabilities(subPlugins, services);

        return renderApp({ ...params, services, store, usageCollection, subPluginRoutes });
      },
    });

    // Register legacy SIEM app for backward compatibility
    core.application.register({
      id: 'siem',
      appRoute: 'app/siem',
      title: 'SIEM',
      visibleIn: [],
      mount: async (_params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();

        const { manageOldSiemRoutes } = await this.lazyHelpersForRoutes();
        const subscription = this.appUpdater$.subscribe(() => {
          // wait for app initialization to set the links
          manageOldSiemRoutes(coreStart);
          subscription.unsubscribe();
        });

        return () => true;
      },
    });

    home?.featureCatalogue.registerSolution({
      id: APP_ID,
      title: SOLUTION_NAME,
      description: i18n.translate('xpack.securitySolution.featureCatalogueDescription', {
        defaultMessage:
          'Prevent, collect, detect, and respond to threats for unified protection across your infrastructure.',
      }),
      icon: 'logoSecurity',
      path: APP_PATH,
      order: 300,
    });

    home?.featureCatalogue.register({
      id: 'ai_assistant_security',
      title: ASSISTANT_MANAGEMENT_TITLE,
      description: i18n.translate(
        'xpack.securitySolution.securityAiAssistantManagement.app.description',
        {
          defaultMessage: 'Manage your AI Assistant for Security.',
        }
      ),
      icon: 'sparkles',
      path: '/app/management/kibana/securityAiAssistantManagement',
      showOnHomePage: false,
      category: 'admin',
    });

    management?.sections.section.kibana.registerApp({
      id: 'securityAiAssistantManagement',
      title: ASSISTANT_MANAGEMENT_TITLE,
      hideFromSidebar: true,
      order: 1,
      mount: async (params) => {
        const { renderApp, services, store } = await mountDependencies();
        const { ManagementSettings } = await this.lazyAssistantSettingsManagement();

        return renderApp({
          ...params,
          services,
          store,
          usageCollection,
          children: <ManagementSettings />,
        });
      },
    });

    cases?.attachmentFramework.registerExternalReference(
      getExternalReferenceAttachmentEndpointRegular()
    );

    this.registerDiscoverSharedFeatures(core, plugins);

    return this.contract.getSetupContract();
  }

  public start(core: CoreStart, plugins: StartPlugins): PluginStart {
    this.services.start(core, plugins);
    this.registerFleetExtensions(core, plugins);
    this.registerPluginUpdates(core, plugins); // Not awaiting to prevent blocking start execution
    return this.contract.getStartContract(core);
  }

  public stop() {
    this.services.stop();
  }

  public async registerDiscoverSharedFeatures(
    core: CoreSetup<StartPluginsDependencies, PluginStart>,
    plugins: SetupPlugins
  ) {
    const { discoverShared } = plugins;
    const discoverFeatureRegistry = discoverShared.features.registry;
    const cellRendererFeature: SecuritySolutionCellRendererFeature = {
      id: 'security-solution-cell-renderer',
      getRenderer: async () => {
        const { getCellRendererForGivenRecord } = await this.getLazyDiscoverSharedDeps();
        return getCellRendererForGivenRecord;
      },
    };

    const appWrapperFeature: SecuritySolutionAppWrapperFeature = {
      id: 'security-solution-app-wrapper',
      getWrapper: async () => {
        const [coreStart, startPlugins] = await core.getStartServices();

        const services = await this.services.generateServices(coreStart, startPlugins);
        const subPlugins = await this.startSubPlugins(this.storage, coreStart, startPlugins);
        const securityStoreForDiscover = await this.getStoreForDiscover(
          coreStart,
          startPlugins,
          subPlugins
        );

        const { createSecuritySolutionDiscoverAppWrapperGetter } =
          await this.getLazyDiscoverSharedDeps();

        return createSecuritySolutionDiscoverAppWrapperGetter({
          core: coreStart,
          services,
          plugins: startPlugins,
          store: securityStoreForDiscover,
        });
      },
    };

    discoverFeatureRegistry.register(cellRendererFeature);
    discoverFeatureRegistry.register(appWrapperFeature);
  }

  public async getLazyDiscoverSharedDeps() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "one_discover_shared_deps" */
      './one_discover'
    );
  }

  /**
   * SubPlugins are the individual building blocks of the Security Solution plugin.
   * They are lazily instantiated to improve startup time.
   * TODO: Move these functions to ./lazy_sub_plugins.ts
   */
  private async createSubPlugins(): Promise<SubPlugins> {
    if (!this._subPlugins) {
      const { subPluginClasses } = await this.lazySubPlugins();
      this._subPlugins = {
        alerts: new subPluginClasses.Detections(),
        assetInventory: new subPluginClasses.AssetInventory(),
        attackDiscovery: new subPluginClasses.AttackDiscovery(),
        rules: new subPluginClasses.Rules(),
        exceptions: new subPluginClasses.Exceptions(),
        cases: new subPluginClasses.Cases(),
        dashboards: new subPluginClasses.Dashboards(),
        explore: new subPluginClasses.Explore(),
        onboarding: new subPluginClasses.Onboarding(),
        overview: new subPluginClasses.Overview(),
        timelines: new subPluginClasses.Timelines(),
        management: new subPluginClasses.Management(),
        cloudDefend: new subPluginClasses.CloudDefend(),
        cloudSecurityPosture: new subPluginClasses.CloudSecurityPosture(),
        threatIntelligence: new subPluginClasses.ThreatIntelligence(),
        entityAnalytics: new subPluginClasses.EntityAnalytics(),
        assets: new subPluginClasses.Assets(),
        investigations: new subPluginClasses.Investigations(),
        machineLearning: new subPluginClasses.MachineLearning(),
        siemMigrations: new subPluginClasses.SiemMigrations(),
      };
    }
    return this._subPlugins;
  }

  private async startSubPlugins(
    storage: Storage,
    core: CoreStart,
    plugins: StartPlugins
  ): Promise<StartedSubPlugins> {
    const subPlugins = await this.createSubPlugins();
    const alerts = await subPlugins.alerts.start(storage, plugins);
    return {
      alerts,
      assetInventory: subPlugins.assetInventory.start(),
      attackDiscovery: subPlugins.attackDiscovery.start(),
      cases: subPlugins.cases.start(),
      cloudDefend: subPlugins.cloudDefend.start(),
      cloudSecurityPosture: subPlugins.cloudSecurityPosture.start(),
      dashboards: subPlugins.dashboards.start(),
      exceptions: subPlugins.exceptions.start(storage),
      explore: subPlugins.explore.start(storage),
      management: subPlugins.management.start(core, plugins),
      onboarding: subPlugins.onboarding.start(),
      overview: subPlugins.overview.start(),
      rules: subPlugins.rules.start(storage),
      threatIntelligence: subPlugins.threatIntelligence.start(),
      timelines: subPlugins.timelines.start(),
      entityAnalytics: subPlugins.entityAnalytics.start(
        this.experimentalFeatures.riskScoringRoutesEnabled
      ),
      assets: subPlugins.assets.start(),
      investigations: subPlugins.investigations.start(),
      machineLearning: subPlugins.machineLearning.start(),
      siemMigrations: subPlugins.siemMigrations.start(
        !this.experimentalFeatures.siemMigrationsDisabled
      ),
    };
  }

  /**
   * Lazily instantiate a `SecurityAppStore`. We lazily instantiate this because it requests large dynamic imports. We instantiate it once because each subPlugin needs to share the same reference.
   */
  private async store(
    coreStart: CoreStart,
    startPlugins: StartPlugins,
    subPlugins: StartedSubPlugins
  ): Promise<SecurityAppStore> {
    if (!this._store) {
      const { createStoreFactory } = await this.lazyApplicationDependencies();

      this._store = await createStoreFactory(
        coreStart,
        startPlugins,
        subPlugins,
        this.storage,
        this.experimentalFeatures
      );
    }
    if (startPlugins.timelines) {
      startPlugins.timelines.setTimelineEmbeddedStore(this._store);
    }
    return this._store;
  }

  /**
   * Lazily instantiate a `SecurityAppStore` for discover.
   */
  private async getStoreForDiscover(
    coreStart: CoreStart,
    startPlugins: StartPlugins,
    subPlugins: StartedSubPlugins
  ): Promise<SecurityAppStore> {
    if (!this._securityStoreForDiscover) {
      const { createStoreFactory } = await this.lazyApplicationDependencies();

      this._securityStoreForDiscover = await createStoreFactory(
        coreStart,
        startPlugins,
        subPlugins,
        this.storage,
        this.experimentalFeatures
      );
    }
    if (startPlugins.timelines) {
      startPlugins.timelines.setTimelineEmbeddedStore(this._securityStoreForDiscover);
    }
    return this._securityStoreForDiscover;
  }

  private async registerActions(
    store: SecurityAppStore,
    history: H.History,
    coreSetup: CoreSetup,
    services: StartServices
  ) {
    if (!this._actionsRegistered) {
      const { registerActions } = await this.lazyActions();
      registerActions(store, history, coreSetup, services);
      this._actionsRegistered = true;
    }
  }

  /**
   * Registers the plugin updates including status, visibleIn, and deepLinks via the plugin updater$.
   */
  private async registerPluginUpdates(core: CoreStart, plugins: StartPlugins) {
    const { license$ } = plugins.licensing;
    const { capabilities } = core.application;
    const { upsellingService, isSolutionNavigationEnabled$ } = this.contract;

    // When the user does not have access to SIEM (main Security feature) nor Security Cases feature, the plugin must be inaccessible.
    if (
      !hasAccessToSecuritySolution(capabilities) &&
      !capabilities.securitySolutionCasesV2?.read_cases
    ) {
      this.appUpdater$.next(() => ({
        status: AppStatus.inaccessible,
        visibleIn: [],
      }));
      // no need to register the links updater when the plugin is inaccessible
      return;
    }

    // Configuration of AppLinks updater registration based on license and capabilities
    const {
      appLinks: initialAppLinks,
      getFilteredLinks,
      solutionAppLinksSwitcher,
    } = await this.lazyApplicationLinks();

    registerDeepLinksUpdater(this.appUpdater$, isSolutionNavigationEnabled$);

    const appLinksToUpdate$ = new Subject<AppLinkItems>();
    appLinksToUpdate$.next(initialAppLinks);

    appLinksToUpdate$
      .pipe(combineLatestWith(license$, isSolutionNavigationEnabled$))
      .subscribe(([appLinks, license, isSolutionNavigationEnabled]) => {
        const links = isSolutionNavigationEnabled ? solutionAppLinksSwitcher(appLinks) : appLinks;
        const linksPermissions: LinksPermissions = {
          experimentalFeatures: this.experimentalFeatures,
          upselling: upsellingService,
          capabilities,
          uiSettingsClient: core.uiSettings,
          ...(license.type != null && { license }),
        };
        updateAppLinks(links, linksPermissions);
      });

    const filteredLinks = await getFilteredLinks(core, plugins);
    appLinksToUpdate$.next(filteredLinks);
  }

  private registerFleetExtensions(core: CoreStart, plugins: StartPlugins) {
    if (!plugins.fleet) {
      return;
    }

    const { registerExtension } = plugins.fleet;
    const registerOptions: FleetUiExtensionGetterOptions = {
      coreStart: core,
      depsStart: plugins,
      services: {
        upsellingService: this.contract.upsellingService,
      },
    };

    registerExtension({
      package: 'endpoint',
      view: 'package-policy-edit',
      Component: getLazyEndpointPolicyEditExtension(registerOptions),
    });

    registerExtension({
      package: 'endpoint',
      view: 'package-policy-response',
      Component: getLazyEndpointPolicyResponseExtension(registerOptions),
    });

    registerExtension({
      package: 'endpoint',
      view: 'package-generic-errors-list',
      Component: getLazyEndpointGenericErrorsListExtension(registerOptions),
    });

    registerExtension({
      package: 'endpoint',
      view: 'package-policy-create',
      Component: getLazyEndpointPolicyCreateExtension(registerOptions),
    });

    registerExtension({
      package: 'endpoint',
      view: 'package-policy-create-multi-step',
      Component: LazyEndpointPolicyCreateMultiStepExtension,
    });

    registerExtension({
      package: 'endpoint',
      view: 'package-detail-custom',
      Component: getLazyEndpointPackageCustomExtension(registerOptions),
    });

    registerExtension({
      package: 'endpoint',
      view: 'package-detail-assets',
      Component: LazyEndpointCustomAssetsExtension,
    });

    registerExtension({
      package: 'endpoint',
      view: 'endpoint-agent-tamper-protection',
      Component: getLazyEndpointAgentTamperProtectionExtension(registerOptions),
    });

    registerExtension({
      package: 'cloud_security_posture',
      view: 'pli-auth-block',
      Component: getLazyCloudSecurityPosturePliAuthBlockExtension(registerOptions),
    });

    registerExtension({
      package: 'cribl',
      view: 'package-policy-replace-define-step',
      Component: LazyCustomCriblExtension,
    });
  }

  // Lazy loaded dependencies

  private lazyHelpersForRoutes() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazyHelpersForRoutes" */
      './helpers'
    );
  }

  /**
   * The dependencies needed to mount the applications. These are dynamically loaded for the sake of webpack bundling efficiency.
   * Webpack is smart enough to only request (and download) this even when it is imported multiple times concurrently.
   */
  private lazyApplicationDependencies() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_application_dependencies" */
      './lazy_application_dependencies'
    );
  }

  /**
   * The dependencies needed to mount the applications. These are dynamically loaded for the sake of webpack bundling efficiency.
   * Webpack is smart enough to only request (and download) this even when it is imported multiple times concurrently.
   */
  private lazySubPlugins() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_sub_plugins" */
      './lazy_sub_plugins'
    );
  }

  private lazyApplicationLinks() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_app_links" */
      './app_links'
    );
  }

  private lazyActions() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_actions" */
      './lazy_actions'
    );
  }

  private lazyAssistantSettingsManagement() {
    /**
     * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
     * See https://webpack.js.org/api/module-methods/#magic-comments
     */
    return import(
      /* webpackChunkName: "lazy_assistant_settings_management" */
      './lazy_assistant_settings_management'
    );
  }
}
