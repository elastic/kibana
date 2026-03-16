/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import { firstNonNullValue } from '../../../../../common/endpoint/models/ecs_safety_helpers';

export interface CorrelationHitRateItem {
  id: string;
  name: string;
  alertCount: number;
  lastSeen: string;
}

interface CorrelationHitRateAggsResponse {
  alertsByRule: {
    buckets?: Array<{
      key: string;
      doc_count: number;
      lastSeen: {
        value_as_string: string;
      };
      lastAlert: {
        hits: {
          hits: [
            {
              fields: {
                'kibana.alert.rule.uuid': string[];
              };
            }
          ];
        };
      };
    }>;
  };
}

const KIBANA_RULE_TYPE = 'kibana.alert.rule.type';
const KIBANA_RULE_NAME = 'kibana.alert.rule.name';
const KIBANA_RULE_ID = 'kibana.alert.rule.uuid';
const TIMESTAMP = '@timestamp';

const getCorrelationHitRateQuery = ({
  from,
  to,
  filterQuery,
}: {
  from: string;
  to: string;
  filterQuery?: ESBoolQuery;
}) => ({
  _source: false,
  fields: [KIBANA_RULE_NAME, KIBANA_RULE_ID, TIMESTAMP],
  size: 0,
  query: {
    bool: {
      filter: [
        { term: { [KIBANA_RULE_TYPE]: 'siem.correlationRule' } },
        { range: { [TIMESTAMP]: { gte: from, lte: to } } },
        ...(filterQuery ? [filterQuery] : []),
      ],
    },
  },
  aggs: {
    alertsByRule: {
      terms: {
        field: KIBANA_RULE_NAME,
        size: 10,
        order: { _count: 'desc' as const },
      },
      aggs: {
        lastSeen: {
          max: { field: TIMESTAMP },
        },
        lastAlert: {
          top_hits: {
            size: 1,
            sort: { [TIMESTAMP]: 'desc' as const },
            _source: false,
            fields: [KIBANA_RULE_ID],
          },
        },
      },
    },
  },
});

const getCorrelationHitRateItems = (
  aggregations?: CorrelationHitRateAggsResponse
): CorrelationHitRateItem[] => {
  const buckets = aggregations?.alertsByRule.buckets ?? [];
  return buckets.map<CorrelationHitRateItem>((bucket) => ({
    id: firstNonNullValue(bucket.lastAlert.hits.hits[0].fields[KIBANA_RULE_ID]) ?? '',
    name: bucket.key,
    alertCount: bucket.doc_count,
    lastSeen: bucket.lastSeen.value_as_string,
  }));
};

export interface UseCorrelationHitRateProps {
  queryId: string;
  signalIndexName: string | null;
  skip?: boolean;
  filterQuery?: ESBoolQuery;
}

export type UseCorrelationHitRate = (props: UseCorrelationHitRateProps) => {
  items: CorrelationHitRateItem[];
  isLoading: boolean;
  updatedAt: number;
};

export const useCorrelationHitRate: UseCorrelationHitRate = ({
  queryId,
  signalIndexName,
  skip = false,
  filterQuery,
}) => {
  const [items, setItems] = useState<CorrelationHitRateItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const { to, from, deleteQuery, setQuery } = useGlobalTime();

  const query = useMemo(
    () =>
      getCorrelationHitRateQuery({
        from,
        to,
        filterQuery,
      }),
    [filterQuery, from, to]
  );

  const {
    loading: isLoading,
    data,
    setQuery: setAlertsQuery,
    response,
    request,
    refetch: refetchQuery,
  } = useQueryAlerts<{}, CorrelationHitRateAggsResponse>({
    query,
    indexName: signalIndexName,
    skip,
    queryName: ALERTS_QUERY_NAMES.CORRELATION_ALERTS,
  });

  useEffect(() => {
    setAlertsQuery(query);
  }, [setAlertsQuery, query]);

  useEffect(() => {
    if (data == null) {
      setItems([]);
    } else {
      setItems(getCorrelationHitRateItems(data.aggregations));
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
