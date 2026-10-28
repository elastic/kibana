/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { useFormContext, useWatch } from 'react-hook-form';
import { useCreateDataView } from '../../../../../hooks/use_create_data_view';
import type { CreateSLOForm } from '../../../types';
import { DATA_VIEW_FIELD } from './index_selection';

/**
 * Returns the data view for the indicator index pattern and data view id currently in the form.
 */
export const useIndicatorDataView = (): { dataView?: DataView; loading: boolean } => {
  const { control, getValues } = useFormContext<CreateSLOForm>();
  // `useWatch` only triggers the re-render; the value is read with `getValues` so that a `setValue` made by a
  // child effect during the first mount (IndexSelection resolving the data view id) is not missed.
  useWatch({ control, name: ['indicator.params.index', DATA_VIEW_FIELD] });
  const [index, dataViewId] = getValues(['indicator.params.index', DATA_VIEW_FIELD]);

  return useCreateDataView({ indexPatternString: index, dataViewId });
};
