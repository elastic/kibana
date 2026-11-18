/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useFetchApmIndices } from '../../../hooks/use_fetch_apm_indices';
import { getIndicatorTypeDefaultValues } from '../helpers/get_indicator_type_default_values';
import type { CreateSLOForm } from '../types';

/**
 * Resets the form to the selected indicator type's defaults.
 * Runs after the commit that unmounts the previous type's fields: resetting earlier (e.g. in the
 * select onChange) clears react-hook-form's field registry before their unmount cleanup runs.
 */
export function useResetOnIndicatorTypeChange({ isEditMode }: { isEditMode: boolean }) {
  const {
    data: { metric: apmIndex },
  } = useFetchApmIndices();
  const { control, reset } = useFormContext<CreateSLOForm>();
  const indicatorType = useWatch({ control, name: 'indicator.type' });
  const previousIndicatorType = useRef(indicatorType);

  useEffect(() => {
    if (isEditMode || indicatorType === previousIndicatorType.current) {
      return;
    }
    previousIndicatorType.current = indicatorType;
    reset(getIndicatorTypeDefaultValues(indicatorType, apmIndex), { keepDefaultValues: true });
  }, [isEditMode, indicatorType, reset, apmIndex]);
}
