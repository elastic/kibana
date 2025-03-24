/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query';
import { getInspectResponse } from '@kbn/observability-shared-plugin/common';
import { FETCH_STATUS, useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { useEffect } from 'react';
import { useKibana } from '../../../../utils/kibana_react';
import { TopAlert } from '../../../..';
import { useBuildRelatedAlertsQuery } from './use_build_related_alerts_query';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../../common/constants';
import { ObservabilityFields } from '../../../../../common/utils/alerting/types';

export const useRelatedAlertsSearch = ({ alert }: { alert: TopAlert<ObservabilityFields> }) => {
  const { services } = useKibana();

  const esQuery = useBuildRelatedAlertsQuery({ alert });

  const addInspectorRequest = useInspectorContext().addInspectorRequest;

  const { data, isError, isFetching } = useSearchAlertsQuery({
    data: services.data,
    ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
    consumers: observabilityAlertFeatureIds,
    query: esQuery,
    useDefaultContext: true,
    pageSize: 100,
    sort: [{ _score: { order: 'desc' } }],
  });

  useEffect(() => {
    if (data?.querySnapshot && addInspectorRequest) {
      const querySnapshot = data.querySnapshot;
      addInspectorRequest({
        data: {
          _inspect: [
            getInspectResponse({
              startTime: Date.now(),
              esRequestParams: JSON.parse(querySnapshot.request?.[0]),
              esResponse: JSON.parse(querySnapshot.response?.[0]),
              esError: null,
              esRequestStatus: 1,
              operationName: 'SearchRelatedAlerts',
              kibanaRequest: {
                route: {
                  path: '/internal/search',
                  method: 'POST',
                },
              } as any,
            }),
          ],
        },
        status: FETCH_STATUS.SUCCESS,
      });
    }
  }, [addInspectorRequest, data]);

  return { data, isLoading: isFetching, isError };
};
