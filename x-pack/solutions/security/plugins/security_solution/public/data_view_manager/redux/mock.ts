/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from './types';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';
import { initialDataViewManagerState, type RootState } from './reducer';
import { mockIndexFields } from '../../common/containers/source/mock';

const dataViewManagerState = structuredClone(initialDataViewManagerState).dataViewManager;

const mockFieldMap: DataViewSpec['fields'] = Object.fromEntries(
  mockIndexFields.map((field) => [field.name, field])
);

const mockDefaultDataViewSpec: DataViewSpec = {
  fields: mockFieldMap,
  id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
  title: [
    '.siem-signals-spacename',
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'traces-apm*',
    'winlogbeat-*',
    '-*elastic-cloud-logs-*',
  ].join(),
};

export const mockDataViewPickerState: RootState = {
  dataViewManager: {
    ...dataViewManagerState,
    timeline: {
      ...dataViewManagerState.timeline,
      dataView: { ...mockDefaultDataViewSpec, id: 'mock-timeline-data-view' },
      status: 'ready',
    },
    default: {
      ...dataViewManagerState.default,
      dataView: mockDefaultDataViewSpec,
      status: 'ready',
    },
    analyzer: {
      ...dataViewManagerState.analyzer,
      dataView: mockDefaultDataViewSpec,
      status: 'ready',
    },
  },
};
