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
 * `refreshFields` is called with `displayErrors` defaulting to `true`, so the platform surfaces its
 * own "Error fetching fields" toast (which includes a "See the full error" button) on failure.
 * The platform catches the error internally and does not re-throw, so no additional catch is needed.
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

  // Omitting the second arg lets displayErrors default to true: the platform shows its own
  // "Error fetching fields" toast (with "See the full error") and catches the error internally.
  await dataViews.refreshFields(dataView);

  return dataView;
};
