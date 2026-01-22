/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';

import type { estypes } from '@elastic/elasticsearch';
import type { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import { useDataFetcher } from './use_data_fetcher';
import { EVENTS_API_URLS, type ExternalEvent } from '../../common/types/events';

export const useFetchAlertData = (alertIds: string[]): [boolean, Record<string, unknown>] => {
  const validIds = useMemo(() => getValidValues(alertIds), [alertIds]);
  const shouldExecuteApiCall = useCallback((ids: string[]) => ids.length > 0, []);

  const { loading, data: alerts } = useDataFetcher<string[], Record<string, unknown> | undefined>({
    paramsForApiCall: validIds,
    initialDataState: undefined,
    executeApiCall: fetchAlerts,
    shouldExecuteApiCall,
  });

  return [loading, alerts ?? {}];
};

const fetchAlerts = async (
  ids: string[],
  abortCtrl: AbortController,
  http: HttpSetup
): Promise<Record<string, unknown> | undefined> => {
  const results: Record<string, unknown> = {};
  const missingIds: string[] = [];

  // First try to fetch from the standard RAC API (Kibana alerts)
  try {
    const response = await http.post<estypes.SearchResponse<Record<string, unknown>>>(
      `${BASE_RAC_ALERTS_API_PATH}/find`,
      {
        body: JSON.stringify({
          query: {
            ids: {
              values: ids,
            },
          },
          track_total_hits: false,
          size: 10000,
        }),
        signal: abortCtrl.signal,
      }
    );

    if (response) {
      const kibanaAlerts = getAlertsGroupedById(response);
      Object.assign(results, kibanaAlerts);

      // Find which IDs are still missing
      for (const id of ids) {
        if (!results[id]) {
          missingIds.push(id);
        }
      }
    }
  } catch {
    // If RAC API fails, try all IDs with external events
    missingIds.push(...ids);
  }

  // If there are missing IDs, try to fetch from external events
  if (missingIds.length > 0) {
    try {
      const externalResponse = await http.get<{ events: ExternalEvent[] }>(EVENTS_API_URLS.EVENTS, {
        query: {
          ids: missingIds.join(','),
        },
        signal: abortCtrl.signal,
      });

      if (externalResponse?.events) {
        for (const event of externalResponse.events) {
          results[event.id] = convertExternalEventToAlertFormat(event);
        }
      }
    } catch {
      // ignore error for retrieving external events
    }
  }

  return Object.keys(results).length > 0 ? results : undefined;
};

const getAlertsGroupedById = (
  data: estypes.SearchResponse<Record<string, unknown>>
): Record<string, unknown> => {
  return data.hits.hits.reduce(
    (acc, { _id, _index, _source }) => ({
      ...acc,
      [_id!]: {
        _id,
        _index,
        ..._source,
      },
    }),
    {}
  );
};

/**
 * Converts an external event to the alert format expected by Cases
 */
const convertExternalEventToAlertFormat = (event: ExternalEvent): Record<string, unknown> => {
  return {
    _id: event.id,
    _index: '.alerts-external.alerts-default',
    '@timestamp': event.timestamp,
    'kibana.alert.uuid': event.id,
    'kibana.alert.rule.name': event.title,
    'kibana.alert.reason': event.message,
    'kibana.alert.status': event.status,
    'kibana.alert.severity': event.severity,
    'kibana.alert.source': event.source,
    'kibana.alert.start': event.timestamp,
    'kibana.alert.raw_payload': event.raw_payload,
    tags: event.tags,
    'kibana.alert.rule.category': 'External Alert',
    'kibana.alert.rule.producer': 'observability',
    'kibana.alert.instance.id': event.id,
  };
};

const getValidValues = (ids: string[]): string[] => {
  return ids.filter((id) => !isEmpty(id));
};
