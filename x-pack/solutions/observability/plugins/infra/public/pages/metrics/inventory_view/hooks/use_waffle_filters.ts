/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { useMemo, useCallback, useEffect } from 'react';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import { constant, identity } from 'fp-ts/function';
import createContainter from 'constate';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import type { InventoryView } from '../../../../../common/inventory_views';
import {
  type InventoryFiltersState,
  inventoryFiltersStateRT,
} from '../../../../../common/inventory_views';
import { useAlertPrefillContext } from '../../../../alerting/use_alert_prefill';
import { useInventoryViewsContext } from './use_inventory_views';

export const DEFAULT_WAFFLE_FILTERS_STATE: InventoryFiltersState = {
  kind: 'kuery',
  expression: '',
};

function mapInventoryViewToState(savedView: InventoryView): InventoryFiltersState {
  return savedView.attributes.filterQuery;
}

export const useWaffleFilters = () => {
  const { currentView } = useInventoryViewsContext();

  const [urlState, setUrlState] = useUrlState<InventoryFiltersState>({
    defaultState: currentView ? mapInventoryViewToState(currentView) : DEFAULT_WAFFLE_FILTERS_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleFilter',
  });

  const isValidKuery = useCallback((expression: string) => {
    try {
      fromKueryExpression(expression);
    } catch (err) {
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    if (currentView) {
      setUrlState(mapInventoryViewToState(currentView));
    }
  }, [currentView, setUrlState]);

  const applyFilterQuery = useCallback(
    (query: string) => {
      if (isValidKuery(query)) {
        setUrlState({ kind: 'kuery', expression: query });
      }
    },
    [isValidKuery, setUrlState]
  );

  const { inventoryPrefill } = useAlertPrefillContext();
  const prefillContext = useMemo(() => inventoryPrefill, [inventoryPrefill]); // For Jest compatibility
  useEffect(
    () => prefillContext.setKuery(urlState.expression),
    [prefillContext, urlState.expression]
  );

  return {
    filterQuery: urlState,
    applyFilterQuery,
    isValidKuery,
    setWaffleFiltersState: applyFilterQuery,
  };
};

export type WaffleFiltersState = InventoryFiltersState;
const encodeUrlState = inventoryFiltersStateRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(inventoryFiltersStateRT.decode(value), fold(constant(undefined), identity));
export const WaffleFilters = createContainter(useWaffleFilters);
export const [WaffleFiltersProvider, useWaffleFiltersContext] = WaffleFilters;
