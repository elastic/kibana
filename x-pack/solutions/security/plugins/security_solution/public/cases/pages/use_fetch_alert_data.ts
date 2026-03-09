/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Ecs } from '@kbn/cases-plugin/common';
import { PageScope } from '../../data_view_manager/constants';
import { useQueryAlerts } from '../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../detections/containers/detection_engine/alerts/constants';
import type { SignalHit } from '../../common/utils/alerts';
import { buildAlertsQuery, formatAlertToEcsSignal } from '../../common/utils/alerts';
import { useSelectedPatterns } from '../../data_view_manager/hooks/use_selected_patterns';

export const useFetchAlertData = (alertIds: string[]): [boolean, Record<string, unknown>] => {
  const selectedPatterns = useSelectedPatterns(PageScope.alerts);

  const alertsQuery = useMemo(() => buildAlertsQuery(alertIds), [alertIds]);

  const { loading: isLoadingAlerts, data: alertsData } = useQueryAlerts<SignalHit, unknown>({
    query: alertsQuery,
    indexName: selectedPatterns[0],
    queryName: ALERTS_QUERY_NAMES.CASES,
  });

  const alerts = useMemo(
    () =>
      alertsData?.hits.hits.reduce<Record<string, Ecs>>(
        (acc, { _id, _index, _source }) => ({
          ...acc,
          [_id]: {
            ...formatAlertToEcsSignal(_source),
            _id,
            _index,
            timestamp: _source['@timestamp'],
          },
        }),
        {}
      ) ?? {},
    [alertsData?.hits.hits]
  );

  return [isLoadingAlerts, alerts];
};
