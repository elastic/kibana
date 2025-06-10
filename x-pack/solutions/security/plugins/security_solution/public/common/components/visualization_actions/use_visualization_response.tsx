/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import type { UseVisualizationResponseResponse } from './types';

export const useVisualizationResponse = ({
  visualizationId,
}: {
  visualizationId: string;
}): UseVisualizationResponseResponse => {
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQueryByIdSelector(), []);
  const { loading, tables, searchSessionId } = useDeepEqualSelector((state) =>
    getGlobalQuery(state, visualizationId)
  );
  const response = useMemo(
    () => ({
      searchSessionId,
      tables,
      loading,
    }),
    [loading, searchSessionId, tables]
  );

  return response;
};
