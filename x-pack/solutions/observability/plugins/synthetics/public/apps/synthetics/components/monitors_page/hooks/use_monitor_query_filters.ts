/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useGetUrlParams } from '../../../hooks';
import { getQueryFilters } from '../../../../../../common/constants/client_defaults';

export const useMonitorQueryFilters = () => {
  const { query } = useGetUrlParams();

  return useMemo(() => {
    return query ? [getQueryFilters(query)] : undefined;
  }, [query]);
};
