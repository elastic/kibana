/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useReducer } from 'react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type {
  SnapshotMetricInput,
  SnapshotCustomMetricInput,
} from '../../../../common/http_api/snapshot_api';

export interface InventoryPrefillState {
  nodeType: InventoryItemType;
  kuery: string | undefined;
  metric: SnapshotMetricInput;
  customMetrics: SnapshotCustomMetricInput[];
  schema: DataSchemaFormat | null;
  region: string;
  accountId: string;
}

const initialState: InventoryPrefillState = {
  nodeType: 'host',
  kuery: undefined,
  metric: { type: 'cpuV2' },
  customMetrics: [],
  schema: 'ecs',
  region: '',
  accountId: '',
};

type Action = { type: 'SET_PARTIAL'; value: Partial<InventoryPrefillState> } | { type: 'RESET' };

function reducer(state: InventoryPrefillState, action: Action): InventoryPrefillState {
  switch (action.type) {
    case 'SET_PARTIAL':
      return { ...state, ...action.value };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export const useInventoryAlertPrefill = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return useMemo(
    () => ({
      nodeType: state.nodeType,
      kuery: state.kuery,
      metric: state.metric,
      customMetrics: state.customMetrics,
      schema: state.schema,
      region: state.region,
      accountId: state.accountId,
      setPrefillState: (value: Partial<InventoryPrefillState>) =>
        dispatch({ type: 'SET_PARTIAL', value }),
      reset: () => dispatch({ type: 'RESET' }),
    }),
    [
      state.nodeType,
      state.kuery,
      state.metric,
      state.customMetrics,
      state.schema,
      state.region,
      state.accountId,
    ]
  );
};
