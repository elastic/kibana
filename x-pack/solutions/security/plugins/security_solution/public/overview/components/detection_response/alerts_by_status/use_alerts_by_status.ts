/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';

import { useDispatch } from 'react-redux';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import type { AlertsByStatusAgg, AlertsByStatusResponse, ParsedAlertsData } from './types';
import {
  STATUS_CRITICAL_LABEL,
  STATUS_HIGH_LABEL,
  STATUS_LOW_LABEL,
  STATUS_MEDIUM_LABEL,
} from '../translations';
import { inputsActions } from '../../../../common/store/inputs';
import type { DeleteQuery, SetQuery } from '../../../../common/containers/use_global_time/types';
import { InputsModelId } from '../../../../common/store/inputs/constants';

export const severityLabels: Record<Severity, string> = {
  critical: STATUS_CRITICAL_LABEL,
  high: STATUS_HIGH_LABEL,
  medium: STATUS_MEDIUM_LABEL,
  low: STATUS_LOW_LABEL,
};

export interface EntityFilter {
  field: string;
  value: string;
}

export const getAlertsByStatusQuery = ({
  additionalFilters = [],
  from,
  to,
  entityFilter,
}: {
  from: string;
  to: string;
  entityFilter?: EntityFilter;
  additionalFilters?: ESBoolQuery[];
}) => ({
  size: 0,
  query: {
    bool: {
      filter: [
        ...additionalFilters,
        { range: { '@timestamp': { gte: from, lte: to } } },
        ...(entityFilter
          ? [
              {
                term: {
                  [entityFilter.field]: entityFilter.value,
                },
              },
            ]
          : []),
      ],
    },
  },
  aggs: {
    alertsByStatus: {
      terms: {
        field: 'kibana.alert.workflow_status',
      },
      aggs: {
        statusBySeverity: {
          terms: {
            field: 'kibana.alert.severity',
          },
        },
      },
    },
  },
});

export const parseAlertsData = (
  response: AlertsByStatusResponse<{}, AlertsByStatusAgg>
): ParsedAlertsData => {
  const statusBuckets = response?.aggregations?.alertsByStatus?.buckets ?? [];

  if (statusBuckets.length === 0) {
    return null;
  }

  return statusBuckets.reduce<ParsedAlertsData>((parsedAlertsData, statusBucket) => {
    const severityBuckets = statusBucket.statusBySeverity?.buckets ?? [];

    return {
      ...parsedAlertsData,
      [statusBucket.key]: {
        total: statusBucket.doc_count,
        severities: severityBuckets.map((severityBucket) => ({
          key: severityBucket.key,
          value: severityBucket.doc_count,
          label: severityLabels[severityBucket.key],
        })),
      },
    };
  }, {});
};

export interface UseAlertsByStatusProps {
  queryId: string;
  signalIndexName: string | null;
  skip?: boolean;
  entityFilter?: EntityFilter;
  additionalFilters?: ESBoolQuery[];
  from: string;
  to: string;
}

export type UseAlertsByStatus = (props: UseAlertsByStatusProps) => {
  items: ParsedAlertsData;
  isLoading: boolean;
  updatedAt: number;
};

export const useAlertsByStatus: UseAlertsByStatus = ({
  additionalFilters,
  entityFilter,
  queryId,
  signalIndexName,
  skip = false,
  to,
  from,
}) => {
  const dispatch = useDispatch();
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<null | ParsedAlertsData>(null);
  const setQuery = useCallback(
    ({ id, inspect, loading, refetch, searchSessionId }: SetQuery) =>
      dispatch(
        inputsActions.setQuery({
          inputId: InputsModelId.global,
          id,
          inspect,
          loading,
          refetch,
          searchSessionId,
        })
      ),
    [dispatch]
  );

  const deleteQuery = useCallback(
    ({ id }: DeleteQuery) =>
      dispatch(inputsActions.deleteOneQuery({ inputId: InputsModelId.global, id })),
    [dispatch]
  );
  const {
    data,
    loading: isLoading,
    refetch: refetchQuery,
    request,
    response,
    setQuery: setAlertsQuery,
  } = useQueryAlerts<{}, AlertsByStatusAgg>({
    query: getAlertsByStatusQuery({
      from,
      to,
      entityFilter,
      additionalFilters,
    }),
    indexName: signalIndexName,
    skip,
    queryName: ALERTS_QUERY_NAMES.BY_STATUS,
  });

  useEffect(() => {
    setAlertsQuery(
      getAlertsByStatusQuery({
        from,
        to,
        entityFilter,
        additionalFilters,
      })
    );
  }, [setAlertsQuery, from, to, entityFilter, additionalFilters]);

  useEffect(() => {
    if (data == null) {
      setItems(null);
    } else {
      setItems(parseAlertsData(data));
    }
    setUpdatedAt(Date.now());
  }, [data]);

  const refetch = useCallback(() => {
    if (!skip && refetchQuery) {
      refetchQuery();
    }
  }, [skip, refetchQuery]);

  useQueryInspector({
    deleteQuery,
    inspect: {
      dsl: [request],
      response: [response],
    },
    refetch,
    setQuery,
    queryId,
    loading: isLoading,
  });

  return { items, isLoading, updatedAt };
};
