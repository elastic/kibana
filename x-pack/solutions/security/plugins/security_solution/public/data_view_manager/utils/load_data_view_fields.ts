/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewsServicePublic } from '@kbn/data-views-plugin/public';

/**
 * Loads the fields for a data view that was registered without them (i.e. created with
 * `skipFetchFields: true`, such as the explore data view). This is deferred until the fields are
 * actually needed to avoid expensive `_field_caps` requests on pages that don't use the data view.
 *
 * The lookup and refresh both pass `displayErrors: false`, so the platform's own error toast is
 * suppressed — callers are responsible for surfacing user-facing feedback on failure.
 *
 * @returns the data view with its fields loaded, or `null` if it already had fields (no work done).
 */
export const loadDataViewFields = async (
  dataViews: DataViewsServicePublic,
  id: string
): Promise<DataView | null> => {
  const dataView = await dataViews.get(id, false);

  if (dataView.fields.length) {
    return null;
  }

  await dataViews.refreshFields(dataView, false);

  return dataView;
};
