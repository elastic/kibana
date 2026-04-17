/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter } from '@kbn/es-query';
import { PageScope } from '../../../../data_view_manager/constants';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * Sets up a DataView from the default sourcerer spec and subscribes to the
 * filter manager.  Used by the rule-based source input to power the query bar.
 */
export const useDataViewSetup = () => {
  const {
    services: { data },
  } = useKibana();
  const { sourcererDataView } = useSourcererDataView(PageScope.default);

  const [dataView, setDataView] = useState<DataView>();
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

  useEffect(() => {
    let cancelled = false;
    let dvId: string | undefined;

    const createDataView = async () => {
      if (!sourcererDataView) return;

      const dv = await data.dataViews.create(sourcererDataView);

      if (cancelled) {
        if (dv.id) data.dataViews.clearInstanceCache(dv.id);
        return;
      }

      dvId = dv.id;
      setDataView(dv);
    };
    createDataView();

    return () => {
      cancelled = true;
      if (dvId) data.dataViews.clearInstanceCache(dvId);
    };
  }, [data.dataViews, sourcererDataView]);

  return { dataView, filters, filterManager };
};
