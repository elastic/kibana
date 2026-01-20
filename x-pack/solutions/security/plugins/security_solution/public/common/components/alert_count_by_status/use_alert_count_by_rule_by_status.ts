/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { firstNonNullValue } from '../../../../common/endpoint/models/ecs_safety_helpers';
import type { ESBoolQuery } from '../../../../common/typed_json';
import type { Status } from '../../../../common/api/detection_engine';
import type { GenericBuckets } from '../../../../common/search_strategy';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { useGlobalTime } from '../../containers/use_global_time';
import { useQueryInspector } from '../page/manage_query';
import type { EntityIdentifiers } from '../../../flyout/document_details/shared/utils';
import { buildEntityFiltersFromEntityIdentifiers as buildEntityFiltersFromEntityIdentifiersBase } from '../../../../common/search_strategy/security_solution/risk_score/common';

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
}
export type UseAlertCountByRuleByStatus = (props: UseAlertCountByRuleByStatusProps) => {
  items: AlertCountByRuleByStatusItem[];
  isLoading: boolean;
  updatedAt: number;
};

const ALERTS_BY_RULE_AGG = 'alertsByRuleAggregation';

export const useAlertCountByRuleByStatus: UseAlertCountByRuleByStatus = ({
  additionalFilters,
  entityIdentifiers,
  queryId,
  statuses,
  skip = false,
  signalIndexName,
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
    }),
    skip,
    queryName: ALERTS_QUERY_NAMES.ALERTS_COUNT_BY_STATUS,
    indexName: signalIndexName,
  });

  useEffect(() => {
    setAlertsQuery(
      buildRuleAlertsByEntityQuery({
        additionalFilters,
        from,
        to,
        entityIdentifiers,
        statuses,
      })
    );
  }, [setAlertsQuery, from, to, entityIdentifiers, statuses, additionalFilters]);

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

/**
 * Builds ESBoolQuery filters from entityIdentifiers following entity store EUID priority logic.
 * Priority order for hosts: host.entity.id > host.id > (host.name/hostname + host.domain) > (host.name/hostname + host.mac) > host.name > host.hostname
 * Priority order for users: user.entity.id > user.id > user.email > user.name (with related fields)
 */
export const buildEntityFiltersFromEntityIdentifiers = (
  entityIdentifiers: EntityIdentifiers
): ESBoolQuery[] => {
  return buildEntityFiltersFromEntityIdentifiersBase(entityIdentifiers) as ESBoolQuery[];
};

export const buildRuleAlertsByEntityQuery = ({
  additionalFilters = [],
  from,
  to,
  entityIdentifiers,
  statuses,
}: {
  additionalFilters?: ESBoolQuery[];
  from: string;
  to: string;
  statuses: string[];
  entityIdentifiers: EntityIdentifiers;
}) => {
  const entityFilters = buildEntityFiltersFromEntityIdentifiers(entityIdentifiers);

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
