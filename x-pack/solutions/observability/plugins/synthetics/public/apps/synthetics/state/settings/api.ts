/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionConnector as RawActionConnector,
  ActionType,
} from '@kbn/triggers-actions-ui-plugin/public';
import { apiService } from '../../../../utils/api_service';
import type {
  DynamicSettings,
  LocationMonitorsResponse,
} from '../../../../../common/runtime_types';
import { DynamicSettingsCodec, LocationMonitorsType } from '../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import type { LocationMonitor } from '.';

interface SaveApiRequest {
  settings: Partial<DynamicSettings>;
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
}: SaveApiRequest): Promise<DynamicSettings> => {
  return await apiService.put(
    SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
    settings,
    DynamicSettingsCodec,
    {
      version: '2023-10-31',
    }
  );
};

export const triggerMwSync = async (): Promise<void> => {
  const url = SYNTHETICS_API_URLS.TRIGGER_TASK_RUN.replace(
    '{taskType}',
    'syncPrivateLocationMonitors'
  );
  await apiService.post(url);
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
