/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import { useCallback, useEffect, useRef } from 'react';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import deepEqual from 'fast-deep-equal';
import { constant, identity } from 'fp-ts/function';
import createContainter from 'constate';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import type { InventoryView } from '../../../../../common/inventory_views';
import {
  type InventoryFiltersState,
  inventoryFiltersStateRT,
} from '../../../../../common/inventory_views';
import { useAlertPrefillContext } from '../../../../alerting/use_alert_prefill';
import { useInventoryViewsContext } from './use_inventory_views';

export const DEFAULT_WAFFLE_FILTERS_STATE: InventoryFiltersState = {
  language: 'kuery',
  query: '',
};

function mapInventoryViewToState(savedView: InventoryView): InventoryFiltersState {
  return {
    language: savedView.attributes.filterQuery.kind,
    query: savedView.attributes.filterQuery.expression,
  };
}

export const useWaffleFilters = () => {
  const { currentView } = useInventoryViewsContext();
  const { inventoryPrefill } = useAlertPrefillContext();
  const { services } = useKibanaContextForPlugin();
  const {
    data: {
      query: { queryString: queryStringService },
    },
  } = services;

  const [urlState, setUrlState] = useUrlState<InventoryFiltersState>({
    defaultState: currentView ? mapInventoryViewToState(currentView) : DEFAULT_WAFFLE_FILTERS_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleFilter',
  });

  const previousViewId = useRef<string | undefined>(currentView?.id);
  useEffect(() => {
    if (currentView && currentView.id !== previousViewId.current) {
      setUrlState(mapInventoryViewToState(currentView));
      previousViewId.current = currentView.id;
    }
  }, [currentView, setUrlState]);

  useEffect(() => {
    if (!deepEqual(queryStringService.getQuery(), urlState)) {
      queryStringService.setQuery(urlState);
    }
  }, [queryStringService, urlState]);

  const isValidKuery = useCallback((expression: string) => {
    try {
      fromKueryExpression(expression);
    } catch (err) {
      return false;
    }
    return true;
  }, []);

  const applyFilterQuery = useCallback(
    (payload: { query?: Query }) => {
      const kuery = payload.query?.query as string;
      if (payload.query && isValidKuery(kuery)) {
        setUrlState({ language: payload.query.language, query: kuery });
      }
    },
    [isValidKuery, setUrlState]
  );

  useEffect(() => {
    inventoryPrefill.setKuery(urlState.query);
  }, [inventoryPrefill, urlState.query]);

  return {
    filterQuery: urlState,
    applyFilterQuery,
    setWaffleFiltersState: applyFilterQuery,
  };
};

export type WaffleFiltersState = InventoryFiltersState;
const encodeUrlState = inventoryFiltersStateRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(inventoryFiltersStateRT.decode(value), fold(constant(undefined), identity));
export const WaffleFilters = createContainter(useWaffleFilters);
export const [WaffleFiltersProvider, useWaffleFiltersContext] = WaffleFilters;
