/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { useTiDataSources } from './use_ti_data_sources';

export const useAllTiDataSources = () => {
  const { to, from } = useMemo(
    () => ({
      to: new Date().toISOString(),
      from: new Date(0).toISOString(),
    }),
    []
  );

  const { tiDataSources, isInitiallyLoaded } = useTiDataSources({ to, from });

  return { tiDataSources, isInitiallyLoaded };
};
