/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
  AppStatus,
  AppUpdater,
  Capabilities,
} from '@kbn/core/public';
import { BehaviorSubject, combineLatestWith, Subject } from 'rxjs';
import { AppLinkItems } from '@kbn/security-solution-plugin/public/common/links';
import {
  SecuritySolutionAiForSocPluginSetup,
  SecuritySolutionAiForSocPluginStart,
  SecuritySolutionAiForSocSetupPluginDependencies,
  SecuritySolutionAiForSocStartPluginDependencies,
  ApplicationLinksUpdateParams,
} from './types';
import { APP_NAME, APP_ICON, APP_PATH, APP_UI_ID } from '../common/constants';
import { PluginServices } from './plugin_services';
import { applicationLinksUpdater } from './application_links_updater';
import { PluginContract } from './plugin_contract';

// Helper function to check if user has access to security solution
const hasAccessToSecuritySolution = (capabilities: Capabilities): boolean => {
  return Boolean(
    capabilities.securitySolution?.show ||
      capabilities.siem?.show ||
      capabilities.securitySolutionCases?.read
  );
};

export class SecuritySolutionAiForSocPlugin
  implements
    Plugin<
      SecuritySolutionAiForSocPluginSetup,
      SecuritySolutionAiForSocPluginStart,
      SecuritySolutionAiForSocSetupPluginDependencies,
      SecuritySolutionAiForSocStartPluginDependencies
    >
{
  private contract: PluginContract;
  private readonly services = new PluginServices();

  private readonly experimentalFeatures = {};
  private appUpdater$ = new Subject<AppUpdater>();

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.contract = new PluginContract();
  }

  public setup(
    core: CoreSetup,
    plugins: SecuritySolutionAiForSocSetupPluginDependencies
  ): SecuritySolutionAiForSocPluginSetup {
    const { home, usageCollection, management, cases } = plugins;

    // Lazily instantiate subPlugins and initialize services
    const mountDependencies = async (params?: AppMountParameters) => {
      const { renderApp } = await this.lazyApplicationDependencies();
      const [coreStart, startPlugins] = await core.getStartServices();

      const services = await this.services.generateServices(
        coreStart,
        startPlugins as SecuritySolutionAiForSocStartPluginDependencies,
        params
      );
      return { renderApp, services };
    };

    // Register main Security Solution plugin
    core.application.register({
      id: APP_UI_ID,
      title: APP_NAME,
      appRoute: APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      visibleIn: ['globalSearch', 'home', 'kibanaOverview'],
      euiIconType: APP_ICON,
      mount: async (params) => {
        const { renderApp, services } = await mountDependencies(params);

        return renderApp({ ...params, services, usageCollection });
      },
    });
    return {};
  }

  /**
   * Registers the plugin updates including status, visibleIn, and deepLinks via the plugin updater$.
   */
  private async registerPluginUpdates(
    core: CoreStart,
    plugins: SecuritySolutionAiForSocStartPluginDependencies
  ) {
    const { license$ } = plugins.licensing;
    const { capabilities } = core.application;

    // When the user does not have any of the capabilities required to access security solution, the plugin should be inaccessible
    // This is necessary to hide security solution from the selectable solutions in the spaces UI
    if (!hasAccessToSecuritySolution(capabilities)) {
      this.appUpdater$.next(() => ({ status: AppStatus.inaccessible, visibleIn: [] }));
      // no need to register the links updater when the plugin is inaccessible. return early
      return;
    }

    // Configuration of AppLinks updater registration based on license and capabilities
    const {
      appLinks: initialAppLinks,
      getFilteredLinks,
      registerDeepLinksUpdater,
    } = await this.lazyApplicationLinks();

    registerDeepLinksUpdater(this.appUpdater$, this.contract.solutionNavigationTree$);

    const appLinksToUpdate$ = new BehaviorSubject<AppLinkItems>(initialAppLinks);

    appLinksToUpdate$.pipe(combineLatestWith(license$)).subscribe(([appLinks, license]) => {
      const params: ApplicationLinksUpdateParams = {
        experimentalFeatures: this.experimentalFeatures,
        upselling: this.contract.upsellingService,
        capabilities,
        uiSettingsClient: core.uiSettings,
        ...(license.type != null && { license }),
      };
      applicationLinksUpdater.update(appLinks, params);
    });

    const filteredLinks = await getFilteredLinks(core, plugins);
    appLinksToUpdate$.next(filteredLinks as unknown as AppLinkItems);
  }

  public start(
    core: CoreStart,
    plugins: SecuritySolutionAiForSocStartPluginDependencies
  ): SecuritySolutionAiForSocPluginStart {
    this.registerPluginUpdates(core, plugins);
    return {
      getGreeting() {
        return 'AI for SOC has started!';
      },
      setSolutionNavigationTree: (navigationTree) => {
        this.contract.solutionNavigationTree$.next(navigationTree);
      },
    };
  }

  public stop() {
    this.services.stop();
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
   * Loads application links dependencies lazily for webpack bundling efficiency
   */
  private lazyApplicationLinks() {
    return import(
      /* webpackChunkName: "lazy_application_links" */
      './links'
    );
  }
}
