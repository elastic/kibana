/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { buildEntityFiltersFromEntityIdentifiers } from '@kbn/entity-store/common';

import { firstNonNullValue } from '../../../../common/endpoint/models/ecs_safety_helpers';
import type { ESBoolQuery } from '../../../../common/typed_json';
import type { Status } from '../../../../common/api/detection_engine';
import type { GenericBuckets } from '../../../../common/search_strategy';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { useGlobalTime } from '../../containers/use_global_time';
import { useQueryInspector } from '../page/manage_query';
import type { EntityIdentifiers } from '../../../flyout/document_details/shared/utils';

export interface AlertCountByRuleByStatusItem {
  ruleName: string;
  count: number;
  uuid: string;
}

export interface UseAlertCountByRuleByStatusProps {
  additionalFilters?: ESBoolQuery[];
  entityIdentifiers: EntityIdentifiers;
  queryId: string;
  statuses: Status[];
  skip?: boolean;
  signalIndexName: string | null;
  /** When true (e.g. from explore pages), entity store filters are not applied; only user.name or host.name term filter from entityIdentifiers is used */
  isExploreContext?: boolean;
}
export type UseAlertCountByRuleByStatus = (props: UseAlertCountByRuleByStatusProps) => {
  items: AlertCountByRuleByStatusItem[];
  isLoading: boolean;
  updatedAt: number;
};

const ALERTS_BY_RULE_AGG = 'alertsByRuleAggregation';

/**
 * Builds a single term filter from entityIdentifiers for explore context:
 * uses user.name or host.name (or host.hostname value on host.name) as the filter field.
 */
const getExploreEntityNameFilter = (
  entityIdentifiers: EntityIdentifiers
): QueryDslQueryContainer[] => {
  const userName = entityIdentifiers['user.name'];
  if (userName != null && userName !== '') {
    return [{ term: { 'user.name': userName } }];
  }
  const hostName = entityIdentifiers['host.name'] ?? entityIdentifiers['host.hostname'];
  if (hostName != null && hostName !== '') {
    return [{ term: { 'host.name': hostName } }];
  }
  return [];
};

export const useAlertCountByRuleByStatus: UseAlertCountByRuleByStatus = ({
  additionalFilters,
  entityIdentifiers,
  queryId,
  statuses,
  skip = false,
  signalIndexName,
  isExploreContext = false,
}) => {
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<AlertCountByRuleByStatusItem[]>([]);

  const { to, from, deleteQuery, setQuery } = useGlobalTime();

  const {
    loading: isLoading,
    data,
    setQuery: setAlertsQuery,
    response,
    request,
    refetch: refetchQuery,
  } = useQueryAlerts({
    query: buildRuleAlertsByEntityQuery({
      additionalFilters,
      from,
      to,
      entityIdentifiers,
      statuses,
      isExploreContext,
    }),
    skip,
    queryName: ALERTS_QUERY_NAMES.ALERTS_COUNT_BY_STATUS,
    indexName: signalIndexName,
  });

  const entityIdentifiersKey = JSON.stringify(entityIdentifiers);
  const additionalFiltersKey = JSON.stringify(additionalFilters ?? []);
  const statusesKey = JSON.stringify(statuses);

  const entityIdentifiersRef = useRef(entityIdentifiers);
  const additionalFiltersRef = useRef(additionalFilters);
  const statusesRef = useRef(statuses);
  entityIdentifiersRef.current = entityIdentifiers;
  additionalFiltersRef.current = additionalFilters;
  statusesRef.current = statuses;

  useEffect(() => {
    setAlertsQuery(
      buildRuleAlertsByEntityQuery({
        additionalFilters: additionalFiltersRef.current ?? [],
        from,
        to,
        entityIdentifiers: entityIdentifiersRef.current,
        statuses: statusesRef.current,
        isExploreContext,
      })
    );
  }, [
    setAlertsQuery,
    from,
    to,
    entityIdentifiersKey,
    statusesKey,
    additionalFiltersKey,
    isExploreContext,
  ]);

  useEffect(() => {
    if (!data) {
      setItems([]);
    } else {
      setItems(parseAlertCountByRuleItems(data.aggregations as AlertCountByRuleByFieldAggregation));
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

export const KIBANA_RULE_ID = 'kibana.alert.rule.uuid';

export const buildRuleAlertsByEntityQuery = ({
  additionalFilters = [],
  from,
  to,
  entityIdentifiers,
  statuses,
  isExploreContext = false,
}: {
  additionalFilters?: ESBoolQuery[];
  from: string;
  to: string;
  statuses: string[];
  entityIdentifiers: EntityIdentifiers;
  isExploreContext?: boolean;
}) => {
  const entityFilters = isExploreContext
    ? getExploreEntityNameFilter(entityIdentifiers)
    : buildEntityFiltersFromEntityIdentifiers(entityIdentifiers);
  return {
    size: 0,
    _source: false,
    fields: [KIBANA_RULE_ID],
    query: {
      bool: {
        filter: [
          ...additionalFilters,
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
          ...(statuses?.length > 0
            ? [
                {
                  terms: {
                    'kibana.alert.workflow_status': statuses,
                  },
                },
              ]
            : []),
          ...entityFilters,
        ],
      },
    },
    aggs: {
      [ALERTS_BY_RULE_AGG]: {
        terms: {
          field: 'kibana.alert.rule.name',
          size: 100,
        },
        aggs: {
          ruleUuid: {
            top_hits: {
              _source: false,
              fields: [KIBANA_RULE_ID],
              size: 1,
            },
          },
        },
      },
    },
  };
};

interface RuleUuidData extends GenericBuckets {
  ruleUuid: {
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
}

interface AlertCountByRuleByFieldAggregation {
  [ALERTS_BY_RULE_AGG]: {
    buckets: RuleUuidData[];
  };
}

const parseAlertCountByRuleItems = (
  aggregations?: AlertCountByRuleByFieldAggregation
): AlertCountByRuleByStatusItem[] => {
  const buckets = aggregations?.[ALERTS_BY_RULE_AGG].buckets ?? [];
  return buckets.map<AlertCountByRuleByStatusItem>((bucket) => {
    const uuid =
      firstNonNullValue(bucket.ruleUuid.hits?.hits[0]?.fields['kibana.alert.rule.uuid']) ?? '';
    return {
      ruleName: firstNonNullValue(bucket.key) ?? '-',
      count: bucket.doc_count,
      uuid,
    };
  });
};
