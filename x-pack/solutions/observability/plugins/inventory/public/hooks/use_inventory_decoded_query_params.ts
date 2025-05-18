/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useCallback, useMemo } from 'react';
import {
  entityPaginationRt,
  entityTypesRt,
  type EntityPagination,
  type EntityType,
} from '../../common/rt_types';
import { useInventoryParams } from './use_inventory_params';
import { useInventoryRouter } from './use_inventory_router';

const entityTypeDecoder = decodeOrThrow(entityTypesRt);
const paginationDecoder = decodeOrThrow(entityPaginationRt);

export function useInventoryDecodedQueryParams() {
  const inventoryRoute = useInventoryRouter();
  const {
    query,
    query: { entityTypes, pagination },
  } = useInventoryParams('/*');

  const resetUrlParam = useCallback(
    (queryParamName: string) => {
      inventoryRoute.push('/', {
        path: {},
        query: {
          ...query,
          [queryParamName]: undefined,
        },
      });
    },
    [inventoryRoute, query]
  );

  const selectedEntityTypes: EntityType = useMemo(() => {
    try {
      return entityTypeDecoder(entityTypes) || {};
    } catch (e) {
      resetUrlParam('entityTypes');
      return {};
    }
  }, [entityTypes, resetUrlParam]);

  const selectedPagination: EntityPagination = useMemo(() => {
    try {
      return paginationDecoder(pagination) || {};
    } catch (error) {
      resetUrlParam('pagination');
      return {};
    }
  }, [pagination, resetUrlParam]);

  return { entityTypes: selectedEntityTypes, pagination: selectedPagination };
}
