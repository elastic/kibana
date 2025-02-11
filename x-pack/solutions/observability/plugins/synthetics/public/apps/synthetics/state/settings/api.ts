/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionConnector as RawActionConnector,
  ActionType,
} from '@kbn/triggers-actions-ui-plugin/public';
import { apiService } from '../../../../utils/api_service';
import {
  DynamicSettings,
  DynamicSettingsCodec,
  DynamicSettingsSaveCodec,
  DynamicSettingsSaveResponse,
  LocationMonitorsResponse,
  LocationMonitorsType,
} from '../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { LocationMonitor } from '.';

interface SaveApiRequest {
  settings: DynamicSettings;
}

export const getDynamicSettings = async (): Promise<DynamicSettings> => {
  return await apiService.get(
    SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
    { version: '2023-10-31' },
    DynamicSettingsCodec
  );
};

export const setDynamicSettings = async ({
  settings,
}: SaveApiRequest): Promise<DynamicSettingsSaveResponse> => {
  const newSettings: DynamicSettings = {
    certAgeThreshold: settings.certAgeThreshold,
    certExpirationThreshold: settings.certExpirationThreshold,
    defaultConnectors: settings.defaultConnectors,
    defaultEmail: settings.defaultEmail,
    defaultTLSRuleEnabled: settings.defaultTLSRuleEnabled,
    defaultStatusRuleEnabled: settings.defaultStatusRuleEnabled,
  };
  return await apiService.put(
    SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
    newSettings,
    DynamicSettingsSaveCodec,
    {
      version: '2023-10-31',
    }
  );
};

export const fetchLocationMonitors = async (): Promise<LocationMonitor[]> => {
  return await apiService.get<LocationMonitorsResponse>(
    SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_MONITORS,
    undefined,
    LocationMonitorsType
  );
};

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;

export const fetchConnectors = async (): Promise<ActionConnector[]> => {
  return await apiService.get(SYNTHETICS_API_URLS.GET_ACTIONS_CONNECTORS);
};

export const fetchActionTypes = async (): Promise<ActionType[]> => {
  return await apiService.get(SYNTHETICS_API_URLS.GET_CONNECTOR_TYPES, {
    feature_id: 'uptime',
  });
};

export const syncGlobalParamsAPI = async (): Promise<boolean> => {
  return await apiService.get(SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS);
};
