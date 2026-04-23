/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';

import { useDispatch } from 'react-redux';
import type { ESBoolQuery, ESQuery } from '../../../../../common/typed_json';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useUiSetting } from '../../../../common/lib/kibana';
import { useEntityFromStore } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
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

export const ENTITY_ID_FIELD = 'entity.id';

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

/**
 * Builds filter clauses: one `term` per field/value pair (AND semantics via bool.filter).
 */
export const buildEntityIdentifierTermFilters = (
  identityFields: Record<string, string>
): ESQuery[] =>
  Object.entries(identityFields).map(([fieldName, fieldValue]) => ({
    term: {
      [fieldName]: fieldValue,
    },
  }));

export const getAlertsByStatusQuery = ({
  additionalFilters = [],
  from,
  to,
  identityFields,
  runtimeMappings,
}: {
  from: string;
  to: string;
  identityFields?: Record<string, string>;
  additionalFilters?: ESBoolQuery[];
  runtimeMappings?: Record<string, unknown>;
}) => {
  const entityFilters =
    identityFields != null && Object.keys(identityFields).length > 0
      ? buildEntityIdentifierTermFilters(identityFields)
      : [];

  return {
    size: 0,
    query: {
      bool: {
        filter: [
          ...additionalFilters,
          { range: { '@timestamp': { gte: from, lte: to } } },
          ...entityFilters,
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
    ...(runtimeMappings ? { runtime_mappings: runtimeMappings } : {}),
  };
};

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
  identityFields: Record<string, string>;
  /**
   * When `identityFields` includes `entity.id`, resolves the store record (Entity Store v2)
   * and expands to ECS-style identifier terms (e.g. `user.entity.id`, `user.name`) for the alerts query.
   * Required for v2 resolution when filtering by canonical store id; if omitted, a plain `entity.id` term is used.
   */
  entityType?: string;
  additionalFilters?: ESBoolQuery[];
  from: string;
  to: string;
  runtimeMappings?: Record<string, unknown>;
}

export type UseAlertsByStatus = (props: UseAlertsByStatusProps) => {
  items: ParsedAlertsData;
  isLoading: boolean;
  updatedAt: number;
};

export const useAlertsByStatus: UseAlertsByStatus = ({
  additionalFilters,
  identityFields,
  entityType,
  queryId,
  signalIndexName,
  skip = false,
  to,
  from,
  runtimeMappings,
}) => {
  const dispatch = useDispatch();
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const identityFieldsStable =
    identityFields != null && Object.keys(identityFields).length > 0
      ? identityFields
      : EMPTY_IDENTITY_FIELDS;
  const entityIdValue = identityFieldsStable[ENTITY_ID_FIELD];
  const storeEntityType = toStoreEntityType(entityType);
  const shouldResolveEntityIdFromStore =
    Boolean(entityIdValue) && entityStoreV2Enabled && storeEntityType != null;

  const entityFromStore = useEntityFromStore({
    entityId: entityIdValue,
    entityType: storeEntityType ?? 'host',
    skip: skip || !shouldResolveEntityIdFromStore,
  });

  const { entityRecord, isLoading: entityFromStoreLoading } = entityFromStore;

  const euidApi = useEntityStoreEuidApi();
  const identityFieldsForQuery = useMemo(
    () =>
      entityStoreV2Enabled
        ? euidApi?.euid?.getEntityIdentifiersFromDocument(
            storeEntityType ?? 'generic',
            entityRecord
          )
        : identityFieldsStable,
    [entityStoreV2Enabled, euidApi?.euid, storeEntityType, entityRecord, identityFieldsStable]
  );

  const skipAlertsQuery =
    skip ||
    (shouldResolveEntityIdFromStore && (entityFromStoreLoading || identityFieldsForQuery == null));

  const isResolvingEntityId = shouldResolveEntityIdFromStore && entityFromStoreLoading;

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

  const alertsQuery = useMemo(
    () =>
      getAlertsByStatusQuery({
        from,
        to,
        identityFields: identityFieldsForQuery ?? identityFieldsStable,
        additionalFilters,
        runtimeMappings,
      }),
    [from, to, identityFieldsForQuery, identityFieldsStable, additionalFilters, runtimeMappings]
  );

  const {
    data,
    loading: isLoading,
    refetch: refetchQuery,
    request,
    response,
    setQuery: setAlertsQuery,
  } = useQueryAlerts<{}, AlertsByStatusAgg>({
    query: alertsQuery,
    indexName: signalIndexName,
    skip: skipAlertsQuery,
    queryName: ALERTS_QUERY_NAMES.BY_STATUS,
  });

  useEffect(() => {
    setAlertsQuery(alertsQuery);
  }, [setAlertsQuery, alertsQuery]);

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

  const inspect = useMemo(
    () => ({
      dsl: [request],
      response: [response],
    }),
    [request, response]
  );

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId,
    loading: isLoading || isResolvingEntityId,
  });

  return { items, isLoading: isLoading || isResolvingEntityId, updatedAt };
};
