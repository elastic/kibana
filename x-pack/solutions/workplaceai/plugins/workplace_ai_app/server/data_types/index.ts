/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource } from '@kbn/data-catalog-plugin/common';
import type { DataCatalogPluginSetup } from '@kbn/data-catalog-plugin/server';

export const workplaceAIDataTypes: DataSource[] = [];

export const registerWorkplaceAIDataTypes = ({
  dataCatalog,
}: {
  dataCatalog: DataCatalogPluginSetup;
}) => {
  workplaceAIDataTypes.forEach((dataSource) => {
    dataCatalog.register(dataSource);
  });
};
