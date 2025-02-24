/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type {
  BrowserUrlService,
  SharePluginSetup,
  SharePluginStart,
} from '@kbn/share-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { createLazyObservabilityPageTemplate } from './components/page_template';
import { createNavigationRegistry } from './components/page_template/helpers/navigation_registry';
import { registerProfilingComponent } from './components/profiling/helpers/component_registry';
export { updateGlobalNavigation } from './services/update_global_navigation';
import {
  AssetDetailsFlyoutLocatorDefinition,
  AssetDetailsLocatorDefinition,
  HostsLocatorDefinition,
  InventoryLocatorDefinition,
  MetricsExplorerLocatorDefinition,
  FlamegraphLocatorDefinition,
  StacktracesLocatorDefinition,
  TopNFunctionsLocatorDefinition,
  ServiceOverviewLocatorDefinition,
  TransactionDetailsByNameLocatorDefinition,
  ServiceEntityLocatorDefinition,
  TransactionDetailsByTraceIdLocatorDefinition,
  type AssetDetailsFlyoutLocator,
  type AssetDetailsLocator,
  type InventoryLocator,
  type HostsLocator,
  type FlamegraphLocator,
  type StacktracesLocator,
  type TopNFunctionsLocator,
  type ServiceOverviewLocator,
  type TransactionDetailsByNameLocator,
  type MetricsExplorerLocator,
  type ServiceEntityLocator,
  type TransactionDetailsByTraceIdLocator,
  type EntitiesInventoryLocator,
  EntitiesInventoryLocatorDefinition,
} from '../common';
import { updateGlobalNavigation } from './services/update_global_navigation';
export interface ObservabilitySharedSetup {
  share: SharePluginSetup;
}

export interface ObservabilitySharedStart {
  spaces?: SpacesPluginStart;
  cases: CasesPublicStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  embeddable: EmbeddableStart;
  share: SharePluginStart;
}

export type ObservabilitySharedPluginSetup = ReturnType<ObservabilitySharedPlugin['setup']>;
export type ObservabilitySharedPluginStart = ReturnType<ObservabilitySharedPlugin['start']>;
export type ProfilingLocators = ObservabilitySharedPluginSetup['locators']['profiling'];

interface ObservabilitySharedLocators {
  infra: {
    assetDetailsLocator: AssetDetailsLocator;
    assetDetailsFlyoutLocator: AssetDetailsFlyoutLocator;
    hostsLocator: HostsLocator;
    inventoryLocator: InventoryLocator;
    metricsExplorerLocator: MetricsExplorerLocator;
  };
  profiling: {
    flamegraphLocator: FlamegraphLocator;
    topNFunctionsLocator: TopNFunctionsLocator;
    stacktracesLocator: StacktracesLocator;
  };
  apm: {
    serviceOverview: ServiceOverviewLocator;
    transactionDetailsByName: TransactionDetailsByNameLocator;
    transactionDetailsByTraceId: TransactionDetailsByTraceIdLocator;
    serviceEntity: ServiceEntityLocator;
  };
  entitiesInventory: EntitiesInventoryLocator;
}

export class ObservabilitySharedPlugin implements Plugin {
  private readonly navigationRegistry = createNavigationRegistry();
  private isSidebarEnabled$: BehaviorSubject<boolean>;

  constructor() {
    this.isSidebarEnabled$ = new BehaviorSubject<boolean>(true);
  }

  public setup(coreSetup: CoreSetup, pluginsSetup: ObservabilitySharedSetup) {
    coreSetup.getStartServices().then(([coreStart]) => {
      coreStart.chrome
        .getChromeStyle$()
        .subscribe((style) => this.isSidebarEnabled$.next(style === 'classic'));
    });

    return {
      registerProfilingComponent,
      locators: this.createLocators(pluginsSetup.share.url),
      navigation: {
        registerSections: this.navigationRegistry.registerSections,
      },
    };
  }

  public start(core: CoreStart, plugins: ObservabilitySharedStart) {
    const { application } = core;

    const PageTemplate = createLazyObservabilityPageTemplate({
      currentAppId$: application.currentAppId$,
      getUrlForApp: application.getUrlForApp,
      navigateToApp: application.navigateToApp,
      navigationSections$: this.navigationRegistry.sections$,
      guidedOnboardingApi: plugins.guidedOnboarding?.guidedOnboardingApi,
      getPageTemplateServices: () => ({ coreStart: core }),
      isSidebarEnabled$: this.isSidebarEnabled$,
    });

    return {
      locators: this.createLocators(plugins.share.url),
      navigation: {
        PageTemplate,
        registerSections: this.navigationRegistry.registerSections,
      },
      updateGlobalNavigation,
    };
  }

  public stop() {}

  private createLocators(urlService: BrowserUrlService): ObservabilitySharedLocators {
    return {
      infra: {
        assetDetailsLocator: urlService.locators.create(new AssetDetailsLocatorDefinition()),
        assetDetailsFlyoutLocator: urlService.locators.create(
          new AssetDetailsFlyoutLocatorDefinition()
        ),
        hostsLocator: urlService.locators.create(new HostsLocatorDefinition()),
        inventoryLocator: urlService.locators.create(new InventoryLocatorDefinition()),
        metricsExplorerLocator: urlService.locators.create(new MetricsExplorerLocatorDefinition()),
      },
      profiling: {
        flamegraphLocator: urlService.locators.create(new FlamegraphLocatorDefinition()),
        topNFunctionsLocator: urlService.locators.create(new TopNFunctionsLocatorDefinition()),
        stacktracesLocator: urlService.locators.create(new StacktracesLocatorDefinition()),
      },
      apm: {
        serviceOverview: urlService.locators.create(new ServiceOverviewLocatorDefinition()),
        transactionDetailsByName: urlService.locators.create(
          new TransactionDetailsByNameLocatorDefinition()
        ),
        transactionDetailsByTraceId: urlService.locators.create(
          new TransactionDetailsByTraceIdLocatorDefinition()
        ),
        serviceEntity: urlService.locators.create(new ServiceEntityLocatorDefinition()),
      },
      entitiesInventory: urlService.locators.create(new EntitiesInventoryLocatorDefinition()),
    };
  }
}
