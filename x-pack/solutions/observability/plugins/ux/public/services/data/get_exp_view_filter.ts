/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTR_URL_FULL } from '@kbn/observability-ui-semantic-conventions';
import { UrlFilter } from '@kbn/exploratory-view-plugin/public';
import { UrlParams } from '../../context/url_params_context/types';
import { uxLocalUIFilterNames, uxLocalUIFilters } from '../../../common/ux_ui_filter';
import { UxUIFilters } from '../../../typings/ui_filters';

export function getExploratoryViewFilter(uiFilters: UxUIFilters, urlParams: UrlParams) {
  const { searchTerm } = urlParams;

  const validFilters = uxLocalUIFilterNames.filter(
    (name) => name in uiFilters && name !== 'serviceName'
  );

  const filters: Record<string, UrlFilter> = {};

  validFilters.forEach((filterName) => {
    const field = uxLocalUIFilters[filterName];
    const value = uiFilters[filterName];
    let curr = filters[field.fieldName] ?? { field: field.fieldName };

    if (filterName.includes('Excluded')) {
      curr = {
        ...curr,
        notValues: value ? [...value] : value,
      };
    } else {
      curr = {
        ...curr,
        values: value ? [...value] : value,
      };
    }

    filters[field.fieldName] = curr;
  });

  if (searchTerm) {
    const urlFilter: UrlFilter = {
      field: ATTR_URL_FULL,
    };
    if (searchTerm) {
      urlFilter.wildcards = [searchTerm];
    }
    filters[ATTR_URL_FULL] = { ...urlFilter, ...filters[ATTR_URL_FULL] };
  }

  return Object.values(filters);
}
