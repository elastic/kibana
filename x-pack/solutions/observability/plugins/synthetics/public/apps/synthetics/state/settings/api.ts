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
  DynamicSettingsSaveResponse,
  LocationMonitorsResponse,
} from '../../../../../common/runtime_types';
import {
  DynamicSettingsCodec,
  DynamicSettingsSaveCodec,
  LocationMonitorsType,
} from '../../../../../common/runtime_types/zod/dynamic_settings';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import type { LocationMonitor } from '.';

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
    privateLocationsSyncInterval: settings.privateLocationsSyncInterval,
    rebalancePrivateLocationShardsEnabled: settings.rebalancePrivateLocationShardsEnabled,
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

export interface MonitorTypesPolicy {
  allowedMonitorTypes: string[];
  spaces: string[];
}

export const getAllowedMonitorTypesPolicy = async (): Promise<MonitorTypesPolicy> => {
  return await apiService.get(SYNTHETICS_API_URLS.MONITOR_TYPES_POLICY);
};

export const setAllowedMonitorTypes = async (
  allowedMonitorTypes: string[],
  spaces?: string[]
): Promise<MonitorTypesPolicy> => {
  // Only forward `spaces` when at least one is selected; an empty list means "keep current".
  const body = spaces?.length ? { allowedMonitorTypes, spaces } : { allowedMonitorTypes };
  return await apiService.put(SYNTHETICS_API_URLS.MONITOR_TYPES_POLICY, body);
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
