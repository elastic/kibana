/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { UX_APP_CONTROL_FIELDS } from '../../../common/embeddables/overview_panel/app_control';
import { uxSearchIndex } from '../../../common/otel_rum';

const dataViewIdForTitle = (title: string): string =>
  `ux_otel_overview_control_${title.replace(/[^A-Z0-9]+/gi, '_').toLowerCase()}`;

const pickAppField = (
  getField: (name: string) => { name: string; aggregatable?: boolean } | undefined
): string => {
  for (const name of UX_APP_CONTROL_FIELDS) {
    const field = getField(name);
    if (field && field.aggregatable !== false) {
      return field.name;
    }
    const keyword = getField(`${name}.keyword`);
    if (keyword && keyword.aggregatable !== false) {
      return keyword.name;
    }
  }
  return UX_APP_CONTROL_FIELDS[0];
};

const persistNewDataView = async (
  dataViews: DataViewsPublicPluginStart,
  preferredId: string,
  title: string
) => {
  // createAndSave also calls setDefault — persist without changing the default data view.
  const created = await dataViews.create(
    {
      id: preferredId,
      title,
      timeFieldName: '@timestamp',
      name: i18n.translate('xpack.ux.dashboard.control.dataViewName', {
        defaultMessage: 'User Experience traces',
      }),
      allowNoIndex: true,
    },
    false,
    false
  );
  await dataViews.createSavedObject(created);
  return created;
};

/** Data view + field used by the dashboard App options-list control. */
export const resolveUxAppControlDataView = async (
  dataViews: DataViewsPublicPluginStart | undefined
): Promise<{ id: string; fieldName: string } | undefined> => {
  if (!dataViews) {
    return undefined;
  }
  const title = uxSearchIndex();
  const preferredId = dataViewIdForTitle(title);
  try {
    const idsWithTitle = await dataViews.getIdsWithTitle();
    const existingId =
      idsWithTitle.find((row) => row.id === preferredId)?.id ??
      idsWithTitle.find((row) => row.title === title)?.id;
    const dataView = existingId
      ? await dataViews.get(existingId)
      : await persistNewDataView(dataViews, preferredId, title);
    const id = dataView.id;
    if (!id) {
      return undefined;
    }
    return {
      id,
      fieldName: pickAppField((name) => dataView.getFieldByName(name)),
    };
  } catch {
    return undefined;
  }
};
