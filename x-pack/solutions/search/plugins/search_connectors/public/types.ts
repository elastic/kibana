/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorDefinition, ConnectorServerSideDefinition } from '@kbn/search-connectors';

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface SearchConnectorsPluginSetup {
  // we don't have docLinks here yet
  getConnectorTypes: () => ConnectorServerSideDefinition[];
}

export interface SearchConnectorsPluginStart {
  getConnectorTypes: () => ConnectorDefinition[];
}

export interface SearchConnectorsPluginSetupDependencies {}

export interface SearchConnectorsPluginStartDependencies {}
