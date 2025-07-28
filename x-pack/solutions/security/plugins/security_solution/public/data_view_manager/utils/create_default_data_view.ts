/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { KibanaDataView, SourcererModel } from '../../sourcerer/store/model';
import { initDataView } from '../../sourcerer/store/model';
import { createSourcererDataView } from '../../sourcerer/containers/create_sourcerer_data_view';
import {
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_ALERT_DATA_VIEW_ID,
  DEFAULT_INDEX_KEY,
  DETECTION_ENGINE_INDEX_URL,
} from '../../../common/constants';
import { hasAccessToSecuritySolution } from '../../helpers_access';

export interface CreateDefaultDataViewDependencies {
  http: CoreStart['http'];
  application: CoreStart['application'];
  uiSettings: CoreStart['uiSettings'];
  dataViewService: DataViewsServicePublic;
  spaces: SpacesPluginStart;
  skip?: boolean;
}

export const createDefaultDataView = async ({
  uiSettings,
  dataViewService,
  spaces,
  skip,
  http,
  application,
}: CreateDefaultDataViewDependencies) => {
  const configPatternList = uiSettings.get(DEFAULT_INDEX_KEY);
  let defaultDataView: SourcererModel['defaultDataView'];
  let alertDataView: SourcererModel['alertDataView'];
  let kibanaDataViews: SourcererModel['kibanaDataViews'];

  let signal: { name: string | null; index_mapping_outdated: null | boolean } = {
    name: null,
    index_mapping_outdated: null,
  };

  if (skip) {
    return {
      kibanaDataViews: [],
      defaultDataView: { ...initDataView },
      alertDataView: { ...initDataView },
      signal,
    };
  }

  try {
    if (hasAccessToSecuritySolution(application.capabilities)) {
      signal = await http.fetch(DETECTION_ENGINE_INDEX_URL, {
        version: '2023-10-31',
        method: 'GET',
      });
    }

    // check for/generate default Security Solution Kibana data view
    const sourcererDataView = await createSourcererDataView({
      body: {
        patternList: [...configPatternList, ...(signal.name != null ? [signal.name] : [])],
      },
      dataViewService,
      dataViewId: `${DEFAULT_DATA_VIEW_ID}-${(await spaces?.getActiveSpace())?.id}`,
      alertDataViewId: `${DEFAULT_ALERT_DATA_VIEW_ID}-${(await spaces?.getActiveSpace())?.id}`,
      signalIndexName: signal.name ?? undefined,
    });

    if (sourcererDataView === undefined) {
      throw new Error('');
    }
    defaultDataView = { ...initDataView, ...sourcererDataView.defaultDataView };
    alertDataView = { ...initDataView, ...sourcererDataView.alertDataView };
    kibanaDataViews = sourcererDataView.kibanaDataViews.map((dataView: KibanaDataView) => ({
      ...initDataView,
      ...dataView,
    }));
  } catch (error) {
    defaultDataView = { ...initDataView, error };
    alertDataView = { ...initDataView, error };
    kibanaDataViews = [];
  }

  return { kibanaDataViews, defaultDataView, alertDataView, signal };
};
