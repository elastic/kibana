/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';

import type { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import { usePluginContext } from './use_plugin_context';

import { useDataFetcher } from './use_data_fetcher';
import { parseAlert } from '../pages/alerts/helpers/parse_alert';
import type { TopAlert } from '../typings/alerts';
import { EVENTS_API_URLS } from '../../common/types/events';

interface AlertDetailParams {
  id: string;
}

export interface AlertData {
  formatted: TopAlert;
  raw: EcsFieldsResponse;
}

export const useFetchAlertDetail = (id: string): [boolean, AlertData | null] => {
  const { observabilityRuleTypeRegistry } = usePluginContext();
  const params = useMemo(
    () => ({ id, ruleType: observabilityRuleTypeRegistry }),
    [id, observabilityRuleTypeRegistry]
  );

  const shouldExecuteApiCall = useCallback(
    (apiCallParams: AlertDetailParams) => !isEmpty(apiCallParams.id),
    []
  );

  const { loading, data: rawAlert } = useDataFetcher<AlertDetailParams, EcsFieldsResponse | null>({
    paramsForApiCall: params,
    initialDataState: null,
    executeApiCall: fetchAlert,
    shouldExecuteApiCall,
  });

  const data = useMemo(() => {
    return rawAlert
      ? {
          formatted: parseAlert(observabilityRuleTypeRegistry)(rawAlert),
          raw: rawAlert,
        }
      : null;
  }, [observabilityRuleTypeRegistry, rawAlert]);

  return [loading, data];
};

const fetchAlert = async (
  { id }: AlertDetailParams,
  abortController: AbortController,
  http: HttpSetup
): Promise<EcsFieldsResponse | null> => {
  // First try to fetch from the standard RAC API (Kibana alerts)
  try {
    const kibanaAlert = await http.get<EcsFieldsResponse>(BASE_RAC_ALERTS_API_PATH, {
      query: {
        id,
      },
      signal: abortController.signal,
    });
    if (kibanaAlert) {
      return kibanaAlert;
    }
  } catch {
    // If not found in Kibana alerts, try external events
  }

  // Try to fetch from external events API
  try {
    const response = await http.get<{ events: Array<{ id: string; [key: string]: unknown }> }>(
      EVENTS_API_URLS.EVENTS,
      {
        query: {
          id,
        },
        signal: abortController.signal,
      }
    );

    if (response?.events?.length > 0) {
      const externalEvent = response.events[0];
      // Convert external event to EcsFieldsResponse format
      return convertExternalEventToEcsFields(externalEvent);
    }
  } catch {
    // ignore error for retrieving external event
  }

      return null;
};

/**
 * Converts an external event to EcsFieldsResponse format for compatibility
 * with the existing alert detail components
 */
function convertExternalEventToEcsFields(
  event: Record<string, unknown>
): EcsFieldsResponse {
  return {
    '@timestamp': event.timestamp as string,
    'kibana.alert.uuid': event.id as string,
    'kibana.alert.rule.name': event.title as string,
    'kibana.alert.reason': event.message as string,
    'kibana.alert.status': event.status as string,
    'kibana.alert.severity': event.severity as string,
    'kibana.alert.source': event.source as string,
    'kibana.alert.start': event.timestamp as string,
    'kibana.alert.raw_payload': event.raw_payload
      ? JSON.stringify(event.raw_payload)
      : undefined,
    tags: event.tags as string[] | undefined,
    // Add rule category for external alerts
    'kibana.alert.rule.category': 'External Alert',
    'kibana.alert.rule.producer': 'observability',
    'kibana.alert.instance.id': event.id as string,
  } as EcsFieldsResponse;
}
