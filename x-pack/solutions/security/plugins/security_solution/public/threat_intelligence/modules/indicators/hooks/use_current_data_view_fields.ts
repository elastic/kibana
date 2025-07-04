/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { useTIDataView } from './use_ti_data_view';

/**
 * Custom hook to retrieve fields from the sourcerer data view.
 */
export const useCurrentDataViewFields = (): FieldSpec[] => {
  const { sourcererDataView } = useTIDataView();

  return useMemo(() => Object.values(sourcererDataView.fields ?? {}), [sourcererDataView.fields]);
};
