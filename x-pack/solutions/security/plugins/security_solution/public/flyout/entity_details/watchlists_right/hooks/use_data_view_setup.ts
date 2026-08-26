/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * Sets up a DataView from the default sourcerer spec and subscribes to the
 * filter manager.  Used by the rule-based source input to power the query bar.
 */
export const useDataViewSetup = () => {
  const {
    services: { data },
  } = useKibana();
  const [filters, setFilters] = useState<Filter[]>([]);
  const filterManager = data.query.filterManager;

  // Subscribe to filter manager updates
  useEffect(() => {
    setFilters(filterManager.getFilters());
    const subscription = filterManager.getUpdates$().subscribe(() => {
      setFilters(filterManager.getFilters());
    });
    return () => subscription.unsubscribe();
  }, [filterManager]);

  return { filters, filterManager };
};
