/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query } from '@kbn/es-query';

export interface FilterSettings {
  end: string | undefined;
  filters: Filter[] | undefined;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  onClose: () => void;
  query: Query | undefined;
  setEnd: React.Dispatch<React.SetStateAction<string | undefined>>;
  setFilters: React.Dispatch<React.SetStateAction<Filter[] | undefined>>;
  setLocalStorageAttackDiscoveryMaxAlerts: React.Dispatch<React.SetStateAction<string | undefined>>;
  setQuery: React.Dispatch<React.SetStateAction<Query | undefined>>;
  setStart: React.Dispatch<React.SetStateAction<string | undefined>>;
  start: string | undefined;
}
