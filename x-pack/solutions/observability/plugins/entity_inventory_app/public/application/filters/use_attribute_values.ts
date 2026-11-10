/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { getEntityInventoryAttributeValues } from '../../mock_inventory_api/get_attribute_values';
import type {
  EntityInventoryAttributeValuesParams,
  EntityInventoryAttributeValuesResponse,
} from '../../inventory_api_types';

export const useAttributeValues = (params: EntityInventoryAttributeValuesParams) => {
  // TODO: the implementation is temporary. Replace the mock call and the loading state with a `useQuery` that calls the real route in https://github.com/elastic/observability-dev/issues/6355
  const { selected, ...otherParams } = params;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const paramsKey = JSON.stringify(otherParams);
  const [state, setState] = useState<
    EntityInventoryAttributeValuesResponse & { isLoading: boolean; error?: Error }
  >({
    values: [],
    invalidSelections: [],
    isLoading: true,
  });

  useEffect(() => {
    let isCurrent = true;
    setState((current) => ({ ...current, isLoading: true, error: undefined }));
    getEntityInventoryAttributeValues({ ...JSON.parse(paramsKey), selected: selectedRef.current })
      .then((response) => {
        if (isCurrent) {
          setState({ ...response, isLoading: false });
        }
      })
      .catch((error: Error) => {
        if (isCurrent) {
          setState({ values: [], invalidSelections: [], isLoading: false, error });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [paramsKey]);

  return state;
};
