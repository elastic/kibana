/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import { FilterItems } from '@kbn/unified-search-plugin/public';

import { SourcererScopeName } from '../../../../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../../../../sourcerer/containers';
import { useDataView } from '../../../alert_selection/use_data_view';

interface FiltersProps {
  filters: Filter[];
}

export const Filters: React.FC<FiltersProps> = React.memo(({ filters }) => {
  // get the sourcerer `DataViewSpec` for alerts:
  const { sourcererDataView, loading: isLoadingIndexPattern } = useSourcererDataView(
    SourcererScopeName.detections
  );

  // create a `DataView` from the `DataViewSpec`:
  const alertsDataView = useDataView({
    dataViewSpec: sourcererDataView,
    loading: isLoadingIndexPattern,
  });

  const isEsql = filters.some((filter) => filter?.query?.language === 'esql');
  const searchBarFilters = useMemo(() => {
    if (!alertsDataView || isEsql) {
      return filters;
    }
    const index = alertsDataView.getIndexPattern();
    const filtersWithUpdatedMetaIndex = filters.map((filter) => {
      return {
        ...filter,
        meta: {
          ...filter.meta,
          index,
        },
      };
    });

    return filtersWithUpdatedMetaIndex;
  }, [alertsDataView, filters, isEsql]);

  if (!alertsDataView) {
    return null;
  }

  const flattenedFilters = mapAndFlattenFilters(searchBarFilters);

  return (
    <EuiFlexGroup data-test-subj={'filters'} wrap responsive={false} gutterSize="xs">
      <FilterItems filters={flattenedFilters} indexPatterns={[alertsDataView]} readOnly />
    </EuiFlexGroup>
  );
});
Filters.displayName = 'Filters';
