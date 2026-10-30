/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { useCreateDataView } from '../../../../../hooks/use_create_data_view';
import { useFormValues } from '../../../hooks/use_form_values';
import { DATA_VIEW_FIELD } from './index_selection';

/**
 * Returns the data view for the indicator index pattern and data view id currently in the form.
 */
export const useIndicatorDataView = (): { dataView?: DataView; loading: boolean } => {
  const [index, dataViewId] = useFormValues(['indicator.params.index', DATA_VIEW_FIELD]);

  return useCreateDataView({ indexPatternString: index, dataViewId });
};
