/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { uniq } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useAbortableAsync } from '@kbn/react-hooks';
import { useKibana } from '../../hooks/use_kibana';
import { useEntityInventorySearch } from '../context/search_context';
import { getTypesInScope } from '../filters/get_filter_controls';
import { useEntityInventoryTypes } from '../filters/use_entity_inventory_types';

const DATA_VIEW_ID_PREFIX = 'entity-inventory:';

export const useEntityInventoryDataView = (): { dataView: DataView | undefined } => {
  const {
    services: { dataViews },
  } = useKibana();
  const { entityCategory, filterSelection } = useEntityInventorySearch();
  const { types } = useEntityInventoryTypes();

  const indexPattern = useMemo(() => {
    const pageCategory = entityCategory === 'all' ? undefined : entityCategory;
    const typesInScope =
      pageCategory || filterSelection.category
        ? getTypesInScope({
            types,
            pageCategory,
            selectedCategory: filterSelection.category,
            selectedType: filterSelection.type,
          })
        : types;

    return uniq(typesInScope.flatMap(({ sources }) => sources.map((source) => source.indexPattern)))
      .sort()
      .join(',');
  }, [types, entityCategory, filterSelection.category, filterSelection.type]);

  const { value: dataView } = useAbortableAsync(
    () =>
      indexPattern
        ? dataViews.create({
            id: `${DATA_VIEW_ID_PREFIX}${indexPattern}`,
            title: indexPattern,
            timeFieldName: '@timestamp',
            allowNoIndex: true,
          })
        : undefined,
    [dataViews, indexPattern],
    { unsetValueOnError: true }
  );

  return { dataView };
};
