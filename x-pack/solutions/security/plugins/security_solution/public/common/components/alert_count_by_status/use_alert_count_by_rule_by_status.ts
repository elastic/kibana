/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { buildEntityIdentifierTermFilters } from '../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { firstNonNullValue } from '../../../../common/endpoint/models/ecs_safety_helpers';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { Status } from '../../../../common/api/detection_engine';
import type { GenericBuckets } from '../../../../common/search_strategy';
import type { ESBoolQuery, ESQuery } from '../../../../common/typed_json';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import type { EntityStoreRecord } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { useEntityFromStore } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { useGlobalTime } from '../../containers/use_global_time';
import { useUiSetting } from '../../lib/kibana';
import { useQueryInspector } from '../page/manage_query';

const ENTITY_ID_FIELD = 'entity.id';

/** Stable empty map so callers passing inline `{}` do not invalidate query memoization every render. */
const EMPTY_IDENTITY_FIELDS: Record<string, string> = {};

const toStoreEntityType = (type: string | undefined): 'host' | 'user' | undefined => {
  if (type === EntityType.host || type === 'host') {
    return 'host';
  }
  if (type === EntityType.user || type === 'user') {
    return 'user';
  }
  return undefined;
};

export interface AlertCountByRuleByStatusItem {
  ruleName: string;
  count: number;
  uuid: string;
}

export interface UseAlertCountByRuleByStatusProps {
  additionalFilters?: ESBoolQuery[];
  /**
   * Resolved entity identifiers (e.g. `host.id`, `entity.id`), aligned with {@link useAlertsByStatus}.
   * When empty or omitted, {@link field} / {@link value} are used as a single legacy term filter.
   */
  identityFields?: Record<string, string> | null;
  entityType?: string;
  entityRecord?: EntityStoreRecord | null;
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
  identityFields,
  entityType,
  queryId,
  statuses,
  skip = false,
  signalIndexName,
  entityRecord: entityRecordInput,
}) => {
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<AlertCountByRuleByStatusItem[]>([]);

  const { to, from, deleteQuery, setQuery } = useGlobalTime();
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  const identityFieldsStable =
    identityFields != null && Object.keys(identityFields).length > 0
      ? identityFields
      : EMPTY_IDENTITY_FIELDS;
  const entityIdValue = identityFieldsStable[ENTITY_ID_FIELD];
  const storeEntityType = toStoreEntityType(entityType);

  const shouldResolveEntityIdFromStore =
    Boolean(entityIdValue) && // entity ID is defined
    entityStoreV2Enabled && // entity store v2 is enabled
    storeEntityType != null && // entity type is mappable to store-supported types
    !entityRecordInput; // entity record not already provided as input

  const entityFromStore = useEntityFromStore({
    entityId: entityIdValue,
    entityType: storeEntityType ?? 'host',
    skip: skip || !shouldResolveEntityIdFromStore,
  });

  const { entityRecord, isLoading: entityFromStoreLoading } = entityFromStore;

  const euidApi = useEntityStoreEuidApi();
  const entityFilters = useMemo(() => {
    if (entityStoreV2Enabled && euidApi?.euid && (entityRecord || entityRecordInput)) {
      // Use the entity record to generate a DSL query fragment
      const filter = euidApi.euid?.dsl.getEuidFilterBasedOnDocument(
        storeEntityType ?? 'generic',
        entityRecord ?? entityRecordInput
      );
      return filter != null ? [filter] : [];
    }

    return identityFieldsStable != null && Object.keys(identityFieldsStable).length > 0
      ? [buildEntityIdentifierTermFilters(identityFieldsStable)]
      : [];
  }, [
    entityStoreV2Enabled,
    euidApi?.euid,
    entityRecord,
    entityRecordInput,
    identityFieldsStable,
    storeEntityType,
  ]);

  const skipAlertsQuery =
    skip || (shouldResolveEntityIdFromStore && (entityFromStoreLoading || !entityFilters.length));

  const isResolvingEntityId = shouldResolveEntityIdFromStore && entityFromStoreLoading;

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
      statuses,
      entityFilters: entityFilters ?? [],
    }),
    skip: skipAlertsQuery,
    queryName: ALERTS_QUERY_NAMES.ALERTS_COUNT_BY_STATUS,
    indexName: signalIndexName,
  });

  useEffect(() => {
    setAlertsQuery(
      buildRuleAlertsByEntityQuery({
        additionalFilters,
        from,
        to,
        statuses,
        entityFilters: entityFilters ?? [],
      })
    );
  }, [setAlertsQuery, from, to, statuses, additionalFilters, identityFieldsStable, entityFilters]);

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
    loading: isLoading || isResolvingEntityId,
  });

  return { items, isLoading: isLoading || isResolvingEntityId, updatedAt };
};

export const KIBANA_RULE_ID = 'kibana.alert.rule.uuid';

export const buildRuleAlertsByEntityQuery = ({
  additionalFilters = [],
  from,
  to,
  statuses,
  entityFilters = [],
}: {
  additionalFilters?: ESBoolQuery[];
  from: string;
  to: string;
  statuses: string[];
  entityFilters?: QueryDslQueryContainer[];
}) => {
  const filterClauses: Array<ESBoolQuery | ESQuery | QueryDslQueryContainer> = [
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
  ];

  return {
    size: 0,
    _source: false,
    fields: [KIBANA_RULE_ID],
    query: {
      bool: {
        filter: filterClauses,
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
