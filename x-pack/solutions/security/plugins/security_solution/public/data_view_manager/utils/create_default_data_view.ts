/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import type { KibanaDataView, SourcererModel } from '../../sourcerer/store/model';
import { initDataView } from '../../sourcerer/store/model';
import { createSourcererDataView } from '../../sourcerer/containers/create_sourcerer_data_view';
import {
  DEFAULT_ALERT_DATA_VIEW_ID,
  DEFAULT_ATTACK_DATA_VIEW_ID,
  DEFAULT_DATA_VIEW_ID,
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
  /**
   * If true, will create the attack data view along with the default and alert data views.
   */
  enableAlertsAndAttacksAlignment?: boolean;
}

export const createDefaultDataView = async ({
  uiSettings,
  dataViewService,
  spaces,
  skip = false,
  http,
  application,
  enableAlertsAndAttacksAlignment = false,
}: CreateDefaultDataViewDependencies) => {
  const configPatternList = uiSettings.get(DEFAULT_INDEX_KEY);
  let defaultDataView: SourcererModel['defaultDataView'];
  let alertDataView: SourcererModel['alertDataView'];
  let attackDataView: SourcererModel['attackDataView'];
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
      attackDataView: { ...initDataView },
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

    const currentSpaceId = (await spaces?.getActiveSpace())?.id;

    // check for/generate default Security Solution Kibana data view
    const sourcererDataView = await createSourcererDataView({
      dataViewService,
      defaultDetails: {
        dataViewId: `${DEFAULT_DATA_VIEW_ID}-${currentSpaceId}`,
        patternList: [...configPatternList, ...(signal.name != null ? [signal.name] : [])],
      },
      alertDetails: {
        dataViewId: `${DEFAULT_ALERT_DATA_VIEW_ID}-${currentSpaceId}`,
        indexName: signal.name ?? undefined,
      },
      ...(enableAlertsAndAttacksAlignment && {
        attackDetails: {
          dataViewId: `${DEFAULT_ATTACK_DATA_VIEW_ID}-${currentSpaceId}`,
          patternList: [
            `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${currentSpaceId}`,
            ...(signal.name != null ? [signal.name] : []),
          ],
        },
      }),
    });

    if (sourcererDataView === undefined) {
      throw new Error('');
    }
    defaultDataView = { ...initDataView, ...sourcererDataView.defaultDataView };
    alertDataView = { ...initDataView, ...sourcererDataView.alertDataView };
    attackDataView = { ...initDataView, ...sourcererDataView.attackDataView };
    kibanaDataViews = sourcererDataView.kibanaDataViews.map((dataView: KibanaDataView) => ({
      ...initDataView,
      ...dataView,
    }));
  } catch (error) {
    defaultDataView = { ...initDataView, error };
    alertDataView = { ...initDataView, error };
    attackDataView = { ...initDataView, error };
    kibanaDataViews = [];
  }

  return { kibanaDataViews, defaultDataView, alertDataView, attackDataView, signal };
};
