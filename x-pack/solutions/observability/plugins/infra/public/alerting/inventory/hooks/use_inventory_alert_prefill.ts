/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useMemo, useCallback } from 'react';
import { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type {
  SnapshotMetricInput,
  SnapshotCustomMetricInput,
} from '../../../../common/http_api/snapshot_api';

interface State {
  nodeType: InventoryItemType;
  metric: SnapshotMetricInput;
  filterQuery?: string;
  customMetrics: SnapshotCustomMetricInput[];
  accountId: string;
  region: string;
  schema?: DataSchemaFormat;
}

type Action =
  | { type: 'SET_NODE_TYPE'; value: InventoryItemType }
  | { type: 'SET_FILTER_QUERY'; value: string }
  | { type: 'SET_METRIC'; value: SnapshotMetricInput }
  | { type: 'SET_CUSTOM_METRICS'; value: SnapshotCustomMetricInput[] }
  | { type: 'SET_ACCOUNT_ID'; value: string }
  | { type: 'SET_REGION'; value: string }
  | { type: 'SET_SCHEMA'; value: DataSchemaFormat };

const initialState: State = {
  nodeType: 'host',
  metric: { type: 'cpuV2' },
  filterQuery: undefined,
  customMetrics: [],
  accountId: '',
  region: '',
  schema: DataSchemaFormat.ECS,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_NODE_TYPE':
      return { ...state, nodeType: action.value };
    case 'SET_FILTER_QUERY':
      return { ...state, filterQuery: action.value };
    case 'SET_METRIC':
      return { ...state, metric: action.value };
    case 'SET_CUSTOM_METRICS':
      return { ...state, customMetrics: action.value };
    case 'SET_ACCOUNT_ID':
      return { ...state, accountId: action.value };
    case 'SET_REGION':
      return { ...state, region: action.value };
    case 'SET_SCHEMA':
      return { ...state, schema: action.value };
    default:
      return state;
  }
}

export const useInventoryAlertPrefill = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Memoize each setter to keep stable references like useState setters
  const setNodeType = useCallback(
    (nodeType: InventoryItemType) => dispatch({ type: 'SET_NODE_TYPE', value: nodeType }),
    []
  );
  const setFilterQuery = useCallback(
    (filterQuery: string) => dispatch({ type: 'SET_FILTER_QUERY', value: filterQuery }),
    []
  );
  const setMetric = useCallback(
    (metric: SnapshotMetricInput) => dispatch({ type: 'SET_METRIC', value: metric }),
    []
  );
  const setCustomMetrics = useCallback(
    (customMetrics: SnapshotCustomMetricInput[]) =>
      dispatch({ type: 'SET_CUSTOM_METRICS', value: customMetrics }),
    []
  );
  const setAccountId = useCallback(
    (accountId: string) => dispatch({ type: 'SET_ACCOUNT_ID', value: accountId }),
    []
  );
  const setRegion = useCallback(
    (region: string) => dispatch({ type: 'SET_REGION', value: region }),
    []
  );
  const setSchema = useCallback(
    (schema: SchemaTypes) => dispatch({ type: 'SET_SCHEMA', value: schema }),
    []
  );

  return useMemo(
    () => ({
      nodeType: state.nodeType,
      metric: state.metric,
      filterQuery: state.filterQuery,
      customMetrics: state.customMetrics,
      accountId: state.accountId,
      region: state.region,
      schema: state.schema,
      setNodeType,
      setFilterQuery,
      setMetric,
      setCustomMetrics,
      setAccountId,
      setRegion,
      setSchema,
    }),
    [
      state.nodeType,
      state.metric,
      state.filterQuery,
      state.customMetrics,
      state.accountId,
      state.region,
      state.schema,
      setNodeType,
      setFilterQuery,
      setMetric,
      setCustomMetrics,
      setAccountId,
      setRegion,
      setSchema,
    ]
  );
};
