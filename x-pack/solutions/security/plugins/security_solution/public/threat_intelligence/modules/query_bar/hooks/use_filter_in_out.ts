/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Filter } from '@kbn/es-query';
import { fieldAndValueValid, getIndicatorFieldAndValue } from '../../indicators/utils/field_value';
import { useIndicatorsFiltersContext } from '../../indicators/hooks/use_filters_context';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';
import type { FilterIn, FilterOut } from '../utils/filter';
import { updateFiltersArray } from '../utils/filter';
import { useTIDataView } from '../../indicators/hooks/use_ti_data_view';

export interface UseFilterInParam {
  /**
   * Indicator used to retrieve the field and value then use to update the filters
   */
  indicator: Indicator | string;
  /**
   * Value used to filter in /out in the KQL bar.
   */
  field: string;
  /**
   * To filter in or out.
   */
  filterType: typeof FilterIn | typeof FilterOut;
}

export interface UseFilterInValue {
  /**
   * Filter function to run on click event.
   */
  filterFn: (() => void) | undefined;
}

/**
 * Custom hook that uses an indicator, a field and a type (FilterIn or FilterOut) and returns the filter function.
 *
 */
export const useFilterInOut = ({
  indicator,
  field,
  filterType,
}: UseFilterInParam): UseFilterInValue => {
  const { filterManager } = useIndicatorsFiltersContext();
  const { sourcererDataView } = useTIDataView();

  const { key, value } =
    typeof indicator === 'string'
      ? { key: field, value: indicator }
      : getIndicatorFieldAndValue(indicator, field);

  const filterFn = useCallback((): void => {
    const existingFilters = filterManager.getFilters();
    const newFilters: Filter[] = updateFiltersArray(
      existingFilters,
      key,
      value,
      filterType,
      sourcererDataView.id
    );
    filterManager.setFilters(newFilters);
  }, [filterManager, filterType, key, sourcererDataView.id, value]);

  if (!fieldAndValueValid(key, value)) {
    return {} as unknown as UseFilterInValue;
  }

  return {
    filterFn,
  };
};
