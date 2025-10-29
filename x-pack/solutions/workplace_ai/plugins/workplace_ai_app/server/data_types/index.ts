/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin/server';
import type { DataSourcesRegistryPluginSetup } from '@kbn/data-sources-registry-plugin/server';

export const workplaceAIDataTypes: DataTypeDefinition[] = [
  {
    id: '1',
    name: 'WebCrawler',
  },
  {
    id: '2',
    name: 'Content Connector',
  },
  {
    id: '3',
    name: 'Federated Content Connector',
  },
];

export const registerWorkplaceAIDataTypes = ({
  dataSourcesRegistry,
}: {
  dataSourcesRegistry: DataSourcesRegistryPluginSetup;
}) => {
  workplaceAIDataTypes.forEach((dataType) => {
    dataSourcesRegistry.register(dataType);
  });
};
