/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { convertFiltersToESQLExpression, convertQueryToESQLExpression } from '@kbn/esql-utils';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../../common/store/inputs';
import { joinAnd } from '../queries/esql';

/** The search bar's query and filter pills as one ES|QL expression; `undefined` when empty. */
export const useSearchBarExpression = (): string | undefined => {
  const getGlobalFilters = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalFilters = useDeepEqualSelector(getGlobalFilters);
  const globalQuery = useDeepEqualSelector(getGlobalQuery);

  return useMemo(() => {
    const { esqlExpression: filterBarExpr } = convertFiltersToESQLExpression(globalFilters);
    return joinAnd(filterBarExpr, convertQueryToESQLExpression(globalQuery));
  }, [globalFilters, globalQuery]);
};
