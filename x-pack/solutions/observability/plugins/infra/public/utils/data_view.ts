/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/common';
import { type FieldSpec } from '@kbn/data-views-plugin/common';
import { TIMESTAMP_FIELD } from '../../common/constants';

export interface ResolvedDataView {
  dataViewReference: DataView;
  indices: string;
  fields: FieldSpec[];
  timeFieldName: string;
}

interface AdhocDataView {
  dataViewsService: DataViewsContract;
  dataViewId: string;
  attributes: DataViewAttributes;
}
interface PersistedDataView {
  dataViewsService: DataViewsContract;
  dataViewId: string;
}

interface DataViewAttributes {
  timeFieldName: string;
  name?: string;
}

const buildResolvedDataView = (dataViewReference: DataView): ResolvedDataView => ({
  indices: dataViewReference.getIndexPattern(),
  timeFieldName: dataViewReference.timeFieldName ?? TIMESTAMP_FIELD,
  fields: dataViewReference.fields ?? [],
  dataViewReference,
});

export const resolveDataView = async ({
  dataViewId,
  dataViewsService,
}: {
  dataViewId: string;
  dataViewsService: DataViewsContract;
}) => {
  try {
    return await resolvePersistedDataView({ dataViewsService, dataViewId });
  } catch {
    return resolveAdHocDataView({
      dataViewsService,
      dataViewId,
      attributes: {
        timeFieldName: TIMESTAMP_FIELD,
      },
    });
  }
};

export const resolvePersistedDataView = async ({
  dataViewsService,
  dataViewId,
}: PersistedDataView): Promise<ResolvedDataView> => {
  const dataView = await dataViewsService.get(dataViewId, false);
  return buildResolvedDataView(dataView);
};

export const resolveAdHocDataView = async ({
  dataViewsService,
  dataViewId,
  attributes,
}: AdhocDataView): Promise<ResolvedDataView> => {
  const { name, timeFieldName } = attributes;

  const dataViewReference = await dataViewsService.get(dataViewId, false, true).catch(() => {
    return dataViewsService.create(
      {
        id: dataViewId,
        name,
        title: dataViewId,
        timeFieldName,
      },
      false,
      false
    );
  });

  return buildResolvedDataView(dataViewReference);
};
