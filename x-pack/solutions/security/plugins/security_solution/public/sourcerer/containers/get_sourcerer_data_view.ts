/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { ensurePatternFormat } from '../../../common/utils/sourcerer';
import type { SourcererDataView } from '../store/model';
import { getDataViewStateFromIndexFields } from '../../common/containers/source/use_data_view';

export const getSourcererDataView = async (
  dataViewId: string,
  dataViewsService: DataViewsServicePublic,
  refreshFields = false
): Promise<SourcererDataView> => {
  const dataView = await dataViewsService.get(dataViewId, true, refreshFields);
  const dataViewData = dataView.toSpec();
  const defaultPatternsList = ensurePatternFormat(dataView.getIndexPattern().split(','));
  const patternList = await dataViewsService.getExistingIndices(defaultPatternsList);

  return {
    loading: false,
    id: dataViewData.id ?? '',
    title: dataView.getIndexPattern(),
    fields: dataViewData.fields,
    patternList,
    dataView: dataViewData,
    browserFields: getDataViewStateFromIndexFields(dataViewData.id ?? '', dataViewData.fields)
      .browserFields,
  };
};
