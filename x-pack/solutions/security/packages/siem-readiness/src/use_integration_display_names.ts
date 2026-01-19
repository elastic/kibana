/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSiemReadinessApi } from './use_siem_readiness_api';

export const useIntegrationDisplayNames = () => {
  const { getIntegrations } = useSiemReadinessApi();

  const nameToTitleMap = useMemo(() => {
    if (!getIntegrations.data?.items) {
      return new Map<string, string>();
    }

    const map = new Map<string, string>();
    getIntegrations.data.items.forEach((pkg) => {
      map.set(pkg.name, pkg.title || pkg.name);
    });

    return map;
  }, [getIntegrations.data?.items]);

  return {
    data: nameToTitleMap,
  };
};
