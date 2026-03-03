/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../../constants';
import { getMockDataView, getMockDataViewWithMatchedIndices } from '../../mocks/mock_data_view';
import type { UseDataViewReturnValue } from '../use_data_view';

const dataViewWithoutMatchedIndices = getMockDataView();

export const defaultImplementation = () =>
  ({
    dataView: dataViewWithoutMatchedIndices,
    status: 'ready',
  } as UseDataViewReturnValue);

const dataViewWithMatchedIndices = getMockDataViewWithMatchedIndices();

export const withMatchedIndices = () =>
  ({
    dataView: dataViewWithMatchedIndices,
    status: 'ready',
  } as UseDataViewReturnValue);

export const withIndices = (
  indices: string[],
  id: string = DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID
) => {
  const dataView = getMockDataViewWithMatchedIndices(indices);
  dataView.id = id;

  return {
    dataView,
    status: 'ready',
  } as UseDataViewReturnValue;
};

export const useDataView = jest.fn(defaultImplementation);
