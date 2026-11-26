/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { AttributeValuesResponse } from '@kbn/entity-inventory-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';
import { toAbsoluteTimeRange } from '../../utils/to_absolute_time_range';

export interface AttributeValuesParams {
  attribute: string;
  types: string[];
  filters: Record<string, string[]>;
  selected: string[];
  timeRange: TimeRange;
}

type AttributeValuesState = Pick<AttributeValuesResponse, 'values' | 'invalidSelections'> & {
  isLoading: boolean;
  error?: Error;
};

export const useAttributeValues = (params: AttributeValuesParams) => {
  const {
    services: { inventoryApi },
  } = useKibana();
  const { selected, ...otherParams } = params;
  // The selection is read when the values are fetched, and does not trigger a fetch by itself.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const paramsKey = JSON.stringify(otherParams);
  const [state, setState] = useState<AttributeValuesState>({
    values: [],
    invalidSelections: [],
    isLoading: true,
  });

  useEffect(() => {
    const { attribute, types, filters, timeRange } = JSON.parse(paramsKey) as typeof otherParams;
    const controller = new AbortController();
    setState((current) => ({ ...current, isLoading: true, error: undefined }));

    const range = toAbsoluteTimeRange(timeRange);
    if (!range) {
      setState({
        values: [],
        invalidSelections: [],
        isLoading: false,
        error: new Error(`Invalid time range: ${timeRange.from} to ${timeRange.to}`),
      });
      return;
    }

    inventoryApi
      .getFilterValues(
        { attribute, types, filters, selected: selectedRef.current, ...range },
        { signal: controller.signal }
      )
      .then(({ values, invalidSelections }) => {
        setState({ values, invalidSelections, isLoading: false });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setState({ values: [], invalidSelections: [], isLoading: false, error });
        }
      });

    return () => controller.abort();
  }, [paramsKey, inventoryApi]);

  return state;
};
