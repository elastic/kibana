/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { getEntityInventoryAttributeValues } from '../../mock_inventory_api/get_attribute_values';
import type { EntityInventoryAttributeValuesParams } from '../../inventory_api_types';

export const useAttributeValues = (params: EntityInventoryAttributeValuesParams) => {
  const paramsKey = JSON.stringify(params);
  const [state, setState] = useState<{ values: string[]; isLoading: boolean }>({
    values: [],
    isLoading: true,
  });

  useEffect(() => {
    let isCurrent = true;
    setState((current) => ({ ...current, isLoading: true }));
    getEntityInventoryAttributeValues(JSON.parse(paramsKey)).then((values) => {
      if (isCurrent) {
        setState({ values, isLoading: false });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [paramsKey]);

  return state;
};
