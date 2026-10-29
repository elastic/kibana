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
  const [state, setState] = useState<{
    types: EntityInventoryTypeDefinition[];
    isLoading: boolean;
  }>({ types: [], isLoading: true });

  useEffect(() => {
    let isCurrent = true;
    getEntityInventoryTypes().then((types) => {
      if (isCurrent) {
        setState({ types, isLoading: false });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  return state;
};
