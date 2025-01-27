/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewListItem, DataView as DataViewType } from '@kbn/data-views-plugin/common';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ensurePatternFormat } from '../../../common/utils/sourcerer';
import type { KibanaDataView } from '../store/model';
import { DEFAULT_TIME_FIELD } from '../../../common/constants';

export interface GetSourcererDataView {
  signal?: AbortSignal;
  body: {
    patternList: string[];
  };
  dataViewService: DataViewsServicePublic;
  dataViewId: string | null;
}

export interface SecurityDataView {
  defaultDataView: KibanaDataView;
  kibanaDataViews: Array<Omit<KibanaDataView, 'fields'>>;
}

export const createSourcererDataView = async ({
  body,
  dataViewService,
  dataViewId,
}: GetSourcererDataView): Promise<SecurityDataView | undefined> => {
  if (dataViewId === null) {
    return;
  }
  let allDataViews: DataViewListItem[] = await dataViewService.getIdsWithTitle();
  const siemDataViewExist = allDataViews.find((dv) => dv.id === dataViewId);

  const { patternList } = body;
  const patternListFormatted = ensurePatternFormat(patternList);
  const patternListAsTitle = patternListFormatted.join();
  let siemDataView: DataViewType;
  let defaultDataView: KibanaDataView;
  if (siemDataViewExist === undefined) {
    try {
      siemDataView = await dataViewService.createAndSave(
        {
          allowNoIndex: true,
          id: dataViewId,
          title: patternListAsTitle,
          timeFieldName: DEFAULT_TIME_FIELD,
        },
        // Override property - if a data view exists with the security solution pattern
        // delete it and replace it with our data view
        true
      );
    } catch (err) {
      const error = transformError(err);
      if (err.name === 'DuplicateDataViewError' || error.statusCode === 409) {
        siemDataView = await dataViewService.get(dataViewId);
      } else {
        throw error;
      }
    }
    defaultDataView = {
      id: siemDataView.id ?? dataViewId,
      patternList: siemDataView.title.split(','),
      title: siemDataView.title,
    };
  } else {
    let patterns = ensurePatternFormat(siemDataViewExist.title.split(','));
    const siemDataViewTitle = siemDataViewExist ? patterns.join() : '';
    if (patternListAsTitle !== siemDataViewTitle) {
      patterns = patternListFormatted;
      siemDataView = await dataViewService.get(dataViewId);
      siemDataView.title = patternListAsTitle;
      await dataViewService.updateSavedObject(siemDataView);
    }
    defaultDataView = {
      id: dataViewId,
      patternList: patterns,
      title: patternListAsTitle,
    };
  }

  if (allDataViews.some((dv) => dv.id === dataViewId)) {
    allDataViews = allDataViews.map((v) =>
      v.id === dataViewId ? { ...v, title: patternListAsTitle } : v
    );
  } else if (defaultDataView !== null) {
    allDataViews.push({ id: defaultDataView.id ?? dataViewId, title: defaultDataView?.title });
  }

  const existingPatternList = await dataViewService.getExistingIndices(defaultDataView.patternList);
  defaultDataView = {
    ...defaultDataView,
    patternList: existingPatternList,
  };
  return {
    defaultDataView,
    kibanaDataViews: allDataViews.map((dv) =>
      dv.id === dataViewId
        ? defaultDataView
        : {
            id: dv.id,
            patternList: dv.title.split(','),
            title: dv.title,
          }
    ),
  };
};
