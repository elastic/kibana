/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';
import { initialDataViewPickerState, type RootState } from './reducer';

const dataViewPickerState = structuredClone(initialDataViewPickerState).dataViewPicker;

const mockDefaultDataViewSpec: DataViewSpec = {
  fields: {},
  id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
  title: '',
};
export const mockDataViewPickerState: RootState = {
  dataViewPicker: {
    ...dataViewPickerState,
    timeline: {
      ...dataViewPickerState.timeline,
      dataView: mockDefaultDataViewSpec,
      status: 'ready',
    },
  },
};
