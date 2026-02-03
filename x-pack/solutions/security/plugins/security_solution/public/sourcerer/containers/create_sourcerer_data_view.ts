/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ensurePatternFormat } from '../../../common/utils/sourcerer';
import type { KibanaDataView } from '../store/model';
import { DEFAULT_TIME_FIELD } from '../../../common/constants';
import {
  DEFAULT_SECURITY_ALERT_DATA_VIEW,
  DEFAULT_SECURITY_ATTACK_DATA_VIEW,
  DEFAULT_SECURITY_DATA_VIEW,
} from '../../data_view_manager/components/data_view_picker/translations';

/**
 * Creates the default data view used by security solution.
 * If the data view already exists, it will update the pattern list if it is different
 * or the name if it is incorrect.
 */
const getDefaultDataView = async ({
  dataViewService,
  allDataViews,
  dataViewId,
  patternListFormatted,
  patternListAsTitle,
}: {
  dataViewService: DataViewsServicePublic;
  allDataViews: DataViewListItem[];
  dataViewId: string;
  patternListFormatted: string[];
  patternListAsTitle: string;
}): Promise<KibanaDataView> => {
  let defaultDataView: KibanaDataView;
  let dataView: DataView;

  const siemDataViewExist = allDataViews.find((dv) => dv.id === dataViewId);
  if (siemDataViewExist === undefined) {
    try {
      dataView = await dataViewService.createAndSave(
        {
          allowNoIndex: true,
          id: dataViewId,
          title: patternListAsTitle,
          timeFieldName: DEFAULT_TIME_FIELD,
          name: DEFAULT_SECURITY_DATA_VIEW,
        },
        // Override property - if a data view exists with the security solution pattern
        // delete it and replace it with our data view
        true
      );
    } catch (err) {
      const error = transformError(err);
      if (err.name === 'DuplicateDataViewError' || error.statusCode === 409) {
        dataView = await dataViewService.get(dataViewId);
      } else {
        throw error;
      }
    }
    defaultDataView = {
      id: dataView.id ?? dataViewId,
      patternList: dataView.title.split(','),
      title: dataView.title,
    };
  } else {
    let patterns = ensurePatternFormat(siemDataViewExist.title.split(','));
    const siemDataViewTitle = siemDataViewExist ? patterns.join() : '';
    const arePatternsDifferent = patternListAsTitle !== siemDataViewTitle;
    const isDefaultDataViewName = siemDataViewExist.name === DEFAULT_SECURITY_DATA_VIEW;

    // Update the saved object if the pattern list is different or the name is incorrect
    if (arePatternsDifferent || !isDefaultDataViewName) {
      dataView = await dataViewService.get(dataViewId);

      if (arePatternsDifferent) {
        patterns = patternListFormatted;
        dataView.title = patternListAsTitle;
      }

      if (!isDefaultDataViewName) {
        dataView.name = DEFAULT_SECURITY_DATA_VIEW;
      }

      await dataViewService.updateSavedObject(dataView);
    }

    defaultDataView = {
      id: dataViewId,
      patternList: patterns,
      title: patternListAsTitle,
    };
  }

  const existingPatternList = await dataViewService.getExistingIndices(defaultDataView.patternList);
  defaultDataView = {
    ...defaultDataView,
    patternList: existingPatternList,
  };

  return defaultDataView;
};

/**
 * Creates the alert data view used by security solution.
 * If the data view already exists, it will update the name if it is incorrect.
 */
const getAlertDataView = async ({
  dataViewService,
  allDataViews,
  alertDetails: { dataViewId, indexName },
}: {
  dataViewService: DataViewsServicePublic;
  allDataViews: DataViewListItem[];
  alertDetails: {
    dataViewId?: string;
    indexName?: string;
  };
}): Promise<KibanaDataView> => {
  let alertDataView: KibanaDataView;
  let dataView: DataView;

  const dataViewExist = allDataViews.find((dv) => dv.id === dataViewId);
  if (indexName && dataViewId && dataViewExist === undefined) {
    try {
      dataView = await dataViewService.createAndSave(
        {
          allowNoIndex: true,
          id: dataViewId,
          title: indexName,
          timeFieldName: DEFAULT_TIME_FIELD,
          name: DEFAULT_SECURITY_ALERT_DATA_VIEW,
          managed: true,
        },
        // Override property - if a data view exists with the security solution pattern
        // delete it and replace it with our data view
        true
      );
    } catch (err) {
      const error = transformError(err);
      if (err.name === 'DuplicateDataViewError' || error.statusCode === 409) {
        dataView = await dataViewService.get(dataViewId);
      } else {
        throw error;
      }
    }
    alertDataView = {
      id: dataView.id ?? dataViewId,
      patternList: dataView.title.split(','),
      title: dataView.title,
    };
  } else {
    // Update the saved object if the name is incorrect
    if (dataViewId && dataViewExist?.name !== DEFAULT_SECURITY_ALERT_DATA_VIEW) {
      const dv = await dataViewService.get(dataViewId);
      dv.name = DEFAULT_SECURITY_ALERT_DATA_VIEW;
      await dataViewService.updateSavedObject(dv);
    }

    alertDataView = {
      id: dataViewId ?? '',
      patternList: indexName ? [indexName] : [],
      title: indexName ?? '',
    };
  }

  return alertDataView;
};

/**
 * Creates the attack data view used by security solution.
 */
const getAttackDataView = async ({
  dataViewService,
  allDataViews,
  attackDetails: { dataViewId, patternList },
}: {
  dataViewService: DataViewsServicePublic;
  allDataViews: DataViewListItem[];
  attackDetails: {
    dataViewId?: string;
    patternList?: string[];
  };
}): Promise<KibanaDataView> => {
  let attackDataView: KibanaDataView;
  let dataView: DataView;

  const dataViewExist = allDataViews.find((dv) => dv.id === dataViewId);
  if (patternList && dataViewId && dataViewExist === undefined) {
    const patternListFormatted = ensurePatternFormat(patternList);
    const patternListAsTitle = patternListFormatted.join();

    try {
      dataView = await dataViewService.createAndSave(
        {
          allowNoIndex: true,
          id: dataViewId,
          title: patternListAsTitle,
          timeFieldName: DEFAULT_TIME_FIELD,
          name: DEFAULT_SECURITY_ATTACK_DATA_VIEW,
          managed: true,
        },
        // Override property - if a data view exists with the security solution pattern
        // delete it and replace it with our data view
        true
      );
    } catch (err) {
      const error = transformError(err);
      if (err.name === 'DuplicateDataViewError' || error.statusCode === 409) {
        dataView = await dataViewService.get(dataViewId);
      } else {
        throw error;
      }
    }
    attackDataView = {
      id: dataView.id ?? dataViewId,
      patternList: dataView.title.split(','),
      title: dataView.title,
    };
  } else {
    attackDataView = {
      id: dataViewId ?? '',
      patternList: patternList ? patternList : [],
      title: patternList ? patternList.join() : '',
    };
  }

  return attackDataView;
};

export interface SecurityDataView {
  defaultDataView: KibanaDataView;
  alertDataView: KibanaDataView;
  attackDataView?: KibanaDataView; // TODO remove optional when we remove the enableAlertsAndAttacksAlignment feature flag
  kibanaDataViews: Array<Omit<KibanaDataView, 'fields'>>;
}

/**
 * Returns sourcerer data view used by security solution.
 * Creates the default, alert, and attack data views if they do not exist.
 */
export const createSourcererDataView = async ({
  dataViewService,
  defaultDetails: { dataViewId, patternList },
  alertDetails,
  attackDetails,
}: {
  dataViewService: DataViewsServicePublic;
  defaultDetails: {
    dataViewId: string | null;
    patternList: string[];
  };
  alertDetails: {
    dataViewId?: string;
    indexName?: string;
  };
  attackDetails?: {
    dataViewId?: string;
    patternList?: string[];
  };
}): Promise<SecurityDataView | undefined> => {
  if (dataViewId === null) {
    return;
  }
  let allDataViews: DataViewListItem[] = await dataViewService.getIdsWithTitle();

  const patternListFormatted = ensurePatternFormat(patternList);
  const patternListAsTitle = patternListFormatted.join();

  const defaultDataView = await getDefaultDataView({
    dataViewService,
    allDataViews,
    dataViewId,
    patternListFormatted,
    patternListAsTitle,
  });

  const alertDataView = await getAlertDataView({
    dataViewService,
    allDataViews,
    alertDetails,
  });

  let attackDataView: KibanaDataView | undefined;
  if (attackDetails) {
    attackDataView = await getAttackDataView({ dataViewService, allDataViews, attackDetails });
  }

  if (allDataViews.some((dv) => dv.id === dataViewId)) {
    allDataViews = allDataViews.map((v) =>
      v.id === dataViewId ? { ...v, title: patternListAsTitle } : v
    );
  } else if (defaultDataView !== null) {
    allDataViews.push({ id: defaultDataView.id ?? dataViewId, title: defaultDataView?.title });
  }

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
    alertDataView,
    ...(attackDataView && { attackDataView }),
  };
};
