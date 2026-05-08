/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewListItem, DataViewsService } from '@kbn/data-views-plugin/common';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  DataViewPayload,
  SecurityDataViewsReadyResult,
} from '../../../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type {
  InitializationFlowContext,
  InitializationFlowDefinition,
  InitializationFlowResult,
} from '../../types';
import {
  DEFAULT_ALERT_DATA_VIEW_ID,
  DEFAULT_ATTACK_DATA_VIEW_ID,
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_INDEX_KEY,
} from '../../../../../common/constants';
import { ensurePatternFormat } from '../../../../../common/utils/sourcerer';

// These match the i18n defaultMessage values used on the frontend.
const DEFAULT_SECURITY_DATA_VIEW_NAME = 'Security solution default';
const DEFAULT_SECURITY_ALERT_DATA_VIEW_NAME = 'Security solution alerts';
const DEFAULT_SECURITY_ATTACK_DATA_VIEW_NAME = 'Security solution attacks';

const DEFAULT_TIME_FIELD = '@timestamp';

export const getOrCreateDefaultDataView = async ({
  dataViewsService,
  allDataViews,
  dataViewId,
  patternListFormatted,
  patternListAsTitle,
}: {
  dataViewsService: DataViewsService;
  allDataViews: DataViewListItem[];
  dataViewId: string;
  patternListFormatted: string[];
  patternListAsTitle: string;
}): Promise<DataViewPayload> => {
  let dataView: DataView;
  const existing = allDataViews.find((dv) => dv.id === dataViewId);

  if (existing === undefined) {
    try {
      dataView = await dataViewsService.createAndSave(
        {
          allowNoIndex: true,
          id: dataViewId,
          name: DEFAULT_SECURITY_DATA_VIEW_NAME,
          timeFieldName: DEFAULT_TIME_FIELD,
          title: patternListAsTitle,
        },
        true
      );
    } catch (err) {
      const error = transformError(err);
      if (err.name === 'DuplicateDataViewError' || error.statusCode === 409) {
        dataView = await dataViewsService.get(dataViewId);
      } else {
        throw error;
      }
    }
  } else {
    const currentPatterns = ensurePatternFormat(existing.title.split(','));
    const arePatternsDifferent = patternListAsTitle !== currentPatterns.join();
    const isCorrectName = existing.name === DEFAULT_SECURITY_DATA_VIEW_NAME;

    if (arePatternsDifferent || !isCorrectName) {
      dataView = await dataViewsService.get(dataViewId);
      if (arePatternsDifferent) {
        dataView.title = patternListAsTitle;
      }
      dataView.title = arePatternsDifferent ? patternListAsTitle : dataView.title;
      dataView.name = DEFAULT_SECURITY_DATA_VIEW_NAME;

      await dataViewsService.updateSavedObject(dataView);
    } else {
      return {
        id: dataViewId,
        title: existing.title,
        patternList: patternListFormatted,
      };
    }
  }

  return {
    id: dataView.id ?? dataViewId,
    title: dataView.title,
    patternList: patternListFormatted,
  };
};

export const getOrCreateAlertDataView = async ({
  dataViewsService,
  allDataViews,
  dataViewId,
  indexName,
}: {
  dataViewsService: DataViewsService;
  allDataViews: DataViewListItem[];
  dataViewId: string;
  indexName: string;
}): Promise<DataViewPayload> => {
  let dataView: DataView;
  const existing = allDataViews.find((dv) => dv.id === dataViewId);

  if (existing === undefined) {
    try {
      dataView = await dataViewsService.createAndSave(
        {
          allowNoIndex: true,
          id: dataViewId,
          managed: true,
          name: DEFAULT_SECURITY_ALERT_DATA_VIEW_NAME,
          timeFieldName: DEFAULT_TIME_FIELD,
          title: indexName,
        },
        true
      );
    } catch (err) {
      const error = transformError(err);
      if (err.name === 'DuplicateDataViewError' || error.statusCode === 409) {
        dataView = await dataViewsService.get(dataViewId);
      } else {
        throw error;
      }
    }
    return {
      id: dataView.id ?? dataViewId,
      title: dataView.title,
      patternList: dataView.title.split(','),
    };
  }

  if (existing.name !== DEFAULT_SECURITY_ALERT_DATA_VIEW_NAME) {
    const dv = await dataViewsService.get(dataViewId);
    dv.name = DEFAULT_SECURITY_ALERT_DATA_VIEW_NAME;
    await dataViewsService.updateSavedObject(dv);
  }

  return {
    id: dataViewId,
    title: indexName,
    patternList: [indexName],
  };
};

export const getOrCreateAttackDataView = async ({
  dataViewsService,
  allDataViews,
  dataViewId,
  patternList,
}: {
  dataViewsService: DataViewsService;
  allDataViews: DataViewListItem[];
  dataViewId: string;
  patternList: string[];
}): Promise<DataViewPayload> => {
  const patternListFormatted = ensurePatternFormat(patternList);
  const patternListAsTitle = patternListFormatted.join();
  const existing = allDataViews.find((dv) => dv.id === dataViewId);

  if (existing === undefined) {
    let dataView: DataView;
    try {
      dataView = await dataViewsService.createAndSave(
        {
          allowNoIndex: true,
          id: dataViewId,
          managed: true,
          name: DEFAULT_SECURITY_ATTACK_DATA_VIEW_NAME,
          timeFieldName: DEFAULT_TIME_FIELD,
          title: patternListAsTitle,
        },
        true
      );
    } catch (err) {
      const error = transformError(err);
      if (err.name === 'DuplicateDataViewError' || error.statusCode === 409) {
        dataView = await dataViewsService.get(dataViewId);
      } else {
        throw error;
      }
    }
    return {
      id: dataView.id ?? dataViewId,
      title: dataView.title,
      patternList: dataView.title.split(','),
    };
  }

  return {
    id: dataViewId,
    title: patternListAsTitle,
    patternList: patternListFormatted,
  };
};

export const initializeSecurityDataViewsFlow: InitializationFlowDefinition<
  SecurityDataViewsReadyResult['payload']
> = {
  id: INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  spaceAware: true,

  runFlow: async (
    context: InitializationFlowContext
  ): Promise<InitializationFlowResult<SecurityDataViewsReadyResult['payload']>> => {
    const securityContext = await context.requestHandlerContext.securitySolution;
    const dataViewsService = await securityContext.getInternalDataViewsService();
    const enableAttackDataView =
      securityContext.getConfig().experimentalFeatures.enableAlertsAndAttacksAlignment;
    const ruleDataService = securityContext.getRuleDataService();
    const spaceId = securityContext.getSpaceId();
    const uiSettingsClient = (await context.requestHandlerContext.core).uiSettings.client;

    const configPatternList: string[] = await uiSettingsClient.get(DEFAULT_INDEX_KEY);
    const signalIndexName = ruleDataService.getResourceName(`security.alerts-${spaceId}`);

    const allDataViews = await dataViewsService.getIdsWithTitle();

    const defaultPatternList = [...configPatternList, signalIndexName];
    const patternListFormatted = ensurePatternFormat(defaultPatternList);
    const patternListAsTitle = patternListFormatted.join();

    const defaultDataViewId = `${DEFAULT_DATA_VIEW_ID}-${spaceId}`;
    const alertDataViewId = `${DEFAULT_ALERT_DATA_VIEW_ID}-${spaceId}`;
    const attackDataViewId = `${DEFAULT_ATTACK_DATA_VIEW_ID}-${spaceId}`;

    const defaultDataView = await getOrCreateDefaultDataView({
      allDataViews,
      dataViewId: defaultDataViewId,
      dataViewsService,
      patternListAsTitle,
      patternListFormatted,
    });

    const alertDataView = await getOrCreateAlertDataView({
      allDataViews,
      dataViewId: alertDataViewId,
      dataViewsService,
      indexName: signalIndexName,
    });

    let attackDataView: DataViewPayload | undefined;
    if (enableAttackDataView) {
      attackDataView = await getOrCreateAttackDataView({
        allDataViews,
        dataViewId: attackDataViewId,
        dataViewsService,
        patternList: [`${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`, signalIndexName],
      });
    }

    // Refresh the list after potential creates/updates so kibanaDataViews is current.
    const updatedDataViews = await dataViewsService.getIdsWithTitle();
    const kibanaDataViews: DataViewPayload[] = updatedDataViews.map((dv) =>
      dv.id === defaultDataViewId
        ? defaultDataView
        : { id: dv.id, patternList: dv.title.split(','), title: dv.title }
    );

    context.logger.info(`Sourcerer data views initialized for space '${spaceId}'`);

    const payload: SecurityDataViewsReadyResult['payload'] = {
      alertDataView,
      defaultDataView,
      kibanaDataViews,
      signalIndexName,
      ...(attackDataView ? { attackDataView } : {}),
    };

    return { status: INITIALIZATION_FLOW_STATUS_READY, payload };
  },
};
