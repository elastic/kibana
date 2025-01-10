/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { docLinks } from '@kbn/search-connectors';
import { getConnectorFullTypes, getConnectorTypes } from '../common/lib/connector_types';
import type {
  SearchConnectorsPluginSetup,
  SearchConnectorsPluginSetupDependencies,
  SearchConnectorsPluginStart,
  SearchConnectorsPluginStartDependencies,
} from './types';

export class SearchConnectorsPlugin
  implements
    Plugin<
      SearchConnectorsPluginSetup,
      SearchConnectorsPluginStart,
      SearchConnectorsPluginSetupDependencies,
      SearchConnectorsPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<SearchConnectorsPluginStartDependencies, SearchConnectorsPluginStart>,
    setupDeps: SearchConnectorsPluginSetupDependencies
  ): SearchConnectorsPluginSetup {
    const connectorTypes = getConnectorTypes(core.http.staticAssets);
    return {
      getConnectorTypes: () => connectorTypes,
    };
  }

  public start(
    core: CoreStart,
    services: SearchConnectorsPluginStartDependencies
  ): SearchConnectorsPluginStart {
    const { http } = core;
    docLinks.setDocLinks(core.docLinks.links);
    const connectorTypes = getConnectorFullTypes(http.staticAssets);
    return {
      getConnectorTypes: () => connectorTypes,
    };
  }

  public stop() {}
}
