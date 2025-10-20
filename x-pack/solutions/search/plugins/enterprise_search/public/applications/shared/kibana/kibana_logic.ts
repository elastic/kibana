/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';

import type { MakeLogicType } from 'kea';
import { kea } from 'kea';

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type {
  ApplicationStart,
  Capabilities,
  ChromeBreadcrumb,
  ScopedHistory,
  IUiSettingsClient,
  ChromeStart,
  SecurityServiceStart,
} from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { IndexMappingProps } from '@kbn/index-management-shared-types';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { MlPluginStart } from '@kbn/ml-plugin/public';
import type { ConnectorDefinition } from '@kbn/search-connectors';
import type { SearchNavigationPluginStart } from '@kbn/search-navigation/public';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '@kbn/search-shared-ui';
import type { AuthenticatedUser, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

import type { ClientConfigType, ProductFeatures } from '../../../../common/types';
import type { ESConfig, UpdateSideNavDefinitionFn } from '../../../plugin';

import { HttpLogic } from '../http';
import type { CreateHrefOptions } from '../react_router_helpers';
import { createHref } from '../react_router_helpers';

type RequiredFieldsOnly<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
};
export interface KibanaLogicProps {
  application: ApplicationStart;
  capabilities: Capabilities;
  charts?: ChartsPluginStart;
  cloud?: CloudSetup & CloudStart;
  config: ClientConfigType;
  connectorTypes?: ConnectorDefinition[];
  console?: ConsolePluginStart;
  coreSecurity?: SecurityServiceStart;
  data?: DataPublicPluginStart;
  esConfig: ESConfig;
  fleet?: FleetStart;
  getChromeStyle$: ChromeStart['getChromeStyle$'];
  getNavLinks: ChromeStart['navLinks']['getAll'];
  history: ScopedHistory;
  indexMappingComponent?: React.FC<IndexMappingProps>;
  isSidebarEnabled: boolean;
  kibanaVersion?: string;
  lens?: LensPublicStart;
  ml?: MlPluginStart;
  navigateToUrl: RequiredFieldsOnly<ApplicationStart['navigateToUrl']>;
  productFeatures: ProductFeatures;
  renderHeaderActions(HeaderActions?: FC): void;
  searchNavigation: SearchNavigationPluginStart;
  security?: SecurityPluginStart;
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setChromeIsVisible(isVisible: boolean): void;
  setDocTitle(title: string): void;
  share?: SharePluginStart;
  uiActions: UiActionsStart;
  uiSettings?: IUiSettingsClient;
  updateSideNavDefinition: UpdateSideNavDefinitionFn;
}

export interface KibanaValues {
  application: ApplicationStart;
  capabilities: Capabilities;
  charts: ChartsPluginStart | null;
  cloud: (CloudSetup & CloudStart) | null;
  config: ClientConfigType;
  connectorTypes: ConnectorDefinition[];
  consolePlugin: ConsolePluginStart | null;
  data: DataPublicPluginStart | null;
  esConfig: ESConfig;
  fleet: FleetStart | null;
  getChromeStyle$: ChromeStart['getChromeStyle$'];
  getNavLinks: ChromeStart['navLinks']['getAll'];
  history: ScopedHistory;
  indexMappingComponent: React.FC<IndexMappingProps> | null;
  isAgentlessEnabled: boolean;
  isCloud: boolean;
  isServerless: boolean;
  isSidebarEnabled: boolean;
  kibanaVersion: string | null;
  lens: LensPublicStart | null;
  ml: MlPluginStart | null;
  navigateToUrl(path: string, options?: CreateHrefOptions): Promise<void>;
  productFeatures: ProductFeatures;
  renderHeaderActions(HeaderActions?: FC): void;
  security: SecurityPluginStart | null;
  searchNavigation: SearchNavigationPluginStart;
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setChromeIsVisible(isVisible: boolean): void;
  setDocTitle(title: string): void;
  share: SharePluginStart | null;
  uiActions: UiActionsStart | null;
  uiSettings: IUiSettingsClient | null;
  updateSideNavDefinition: UpdateSideNavDefinitionFn;
  user: AuthenticatedUser | null;
}

export const KibanaLogic = kea<MakeLogicType<KibanaValues>>({
  actions: {
    setUser: (user: AuthenticatedUser | null) => ({ user }),
  },
  path: ['enterprise_search', 'kibana_logic'],
  reducers: ({ props }) => ({
    application: [props.application, {}],
    capabilities: [props.capabilities, {}],
    charts: [props.charts || null, {}],
    cloud: [props.cloud || null, {}],
    config: [props.config || null, {}],
    connectorTypes: [props.connectorTypes || [], {}],
    consolePlugin: [props.console || null, {}],
    data: [props.data || null, {}],
    esConfig: [props.esConfig || { elasticsearch_host: ELASTICSEARCH_URL_PLACEHOLDER }, {}],
    fleet: [props.fleet || null, {}],
    getChromeStyle$: [props.getChromeStyle$, {}],
    getNavLinks: [props.getNavLinks, {}],
    history: [props.history, {}],
    indexMappingComponent: [props.indexMappingComponent || null, {}],
    isSidebarEnabled: [props.isSidebarEnabled, {}],
    kibanaVersion: [props.kibanaVersion || null, {}],
    lens: [props.lens || null, {}],
    ml: [props.ml || null, {}],
    navigateToUrl: [
      (url: string, options?: CreateHrefOptions) => {
        const deps = { history: props.history, http: HttpLogic.values.http };
        const href = createHref(url, deps, options);
        return props.navigateToUrl(href);
      },
      {},
    ],
    productFeatures: [props.productFeatures, {}],
    renderHeaderActions: [props.renderHeaderActions, {}],
    searchNavigation: [props.searchNavigation, {}],
    security: [props.security || null, {}],
    setBreadcrumbs: [props.setBreadcrumbs, {}],
    setChromeIsVisible: [props.setChromeIsVisible, {}],
    setDocTitle: [props.setDocTitle, {}],
    share: [props.share || null, {}],
    uiActions: [props.uiActions, {}],
    uiSettings: [props.uiSettings, {}],
    updateSideNavDefinition: [props.updateSideNavDefinition, {}],
    user: [
      props.user || null,
      {
        setUser: (_, { user }) => user || null,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    isAgentlessEnabled: [
      () => [selectors.cloud, selectors.fleet],
      (cloud?: CloudSetup & CloudStart, fleet?: FleetStart) =>
        (cloud?.isCloudEnabled || cloud?.isServerlessEnabled) &&
        fleet?.config?.agentless?.enabled === true,
    ],
    isCloud: [
      () => [selectors.cloud],
      (cloud?: CloudSetup & CloudStart) => Boolean(cloud?.isCloudEnabled),
    ],
    isServerless: [
      () => [selectors.cloud],
      (cloud?: CloudSetup | CloudStart) => Boolean(cloud?.isServerlessEnabled),
    ],
  }),
});

export const mountKibanaLogic = (props: KibanaLogicProps) => {
  KibanaLogic(props);
  const unmount = KibanaLogic.mount();
  props.coreSecurity?.authc.getCurrentUser()?.then((user) => {
    KibanaLogic.actions.setUser(user);
  });
  return unmount;
};
