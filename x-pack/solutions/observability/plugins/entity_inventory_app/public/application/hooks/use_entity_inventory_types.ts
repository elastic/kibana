/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { getEntityInventoryTypes } from '../../mock_inventory_api/get_types';
import type { EntityInventoryTypeDefinition } from '../../inventory_api_types';

export const useEntityInventoryTypes = () => {
  // TODO: the implementation is temporary. Replace the mock call and the loading state with a `useQuery` that calls the real route in https://github.com/elastic/observability-dev/issues/6355
  const [state, setState] = useState<{
    types: EntityInventoryTypeDefinition[];
    isLoading: boolean;
    error?: Error;
  }>({ types: [], isLoading: true });

  useEffect(() => {
    let isCurrent = true;
    getEntityInventoryTypes()
      .then((types) => {
        if (isCurrent) {
          setState({ types, isLoading: false });
        }
      })
      .catch((error: Error) => {
        if (isCurrent) {
          setState({ types: [], isLoading: false, error });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return state;
};
