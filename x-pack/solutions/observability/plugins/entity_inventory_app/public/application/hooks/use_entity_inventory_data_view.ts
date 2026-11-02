/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';

/**
 * Provides the data view backing the search bar's field suggestions and filter editor.
 * No data view is used until the entity inventory data source is decided, so KQL works
 * without field autocomplete and the add-filter field list is empty.
 */
export const useEntityInventoryDataView = (): { dataView: DataView | undefined } => ({
  dataView: undefined,
});
