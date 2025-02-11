/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import type { DataViewPickerScopeName } from '../constants';
import { sourcererAdapterSelector } from '../redux';

/**
 * Returns data view selection for given scopeName
 */
export const useDataView = (scopeName: DataViewPickerScopeName) => {
  return useSelector(sourcererAdapterSelector(scopeName));
};
