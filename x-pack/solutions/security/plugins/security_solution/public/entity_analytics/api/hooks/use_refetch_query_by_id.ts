/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../common/store';

export const useRefetchQueryById = (QueryId: string) => {
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQueryByIdSelector(), []);
  const { refetch } = useDeepEqualSelector((state) => getGlobalQuery(state, QueryId));
  return refetch;
};
