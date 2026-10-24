/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESFilter } from '@kbn/es-types';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { uxLocalUIFilterNames, uxLocalUIFilters } from '../../../common/ux_ui_filter';
import type { UxUIFilters } from '../../../typings/ui_filters';
import { environmentQuery } from '../../components/app/rum_dashboard/local_uifilters/queries';
import { rumServiceNameTermsValues } from './rum_otel_filters';
import { OTEL_BROWSER_NAME, OTEL_BROWSER_OS } from '../../../common/otel_rum';

export function getEsFilter(uiFilters: UxUIFilters, exclude?: boolean) {
  const localFilterValues = uiFilters;
  const mappedFilters = uxLocalUIFilterNames
    .filter((name) => {
      const validFilter = name in localFilterValues;
      if (typeof name !== 'string') return false;
      if (exclude) {
        return name.includes('Excluded') && validFilter;
      }
      return !name.includes('Excluded') && validFilter;
    })
    .map((filterName) => {
      const field = uxLocalUIFilters[filterName];
      const value = localFilterValues[filterName];

      if (filterName === 'serviceName' && Array.isArray(value) && value.length > 0) {
        return rumServiceNameTermsValues(value);
      }

      if (
        (filterName === 'transactionUrl' || filterName === 'transactionUrlExcluded') &&
        Array.isArray(value) &&
        value.length > 0
      ) {
        // Prefer exact terms on classic; also OR OTel URL paths for each value
        return {
          bool: {
            should: value.flatMap((v) => [
              { term: { [field.fieldName]: v } },
              { term: { 'attributes.url.full': v } },
              { term: { 'attributes.page.url': v } },
              { term: { 'attributes.http.url': v } },
            ]),
            minimum_should_match: 1,
          },
        };
      }

      if (filterName === 'browser' && Array.isArray(value) && value.length > 0) {
        return {
          bool: {
            should: [
              { terms: { [field.fieldName]: value } },
              { terms: { [OTEL_BROWSER_NAME]: value } },
            ],
            minimum_should_match: 1,
          },
        };
      }

      if (filterName === 'os' && Array.isArray(value) && value.length > 0) {
        return {
          bool: {
            should: [
              { terms: { [field.fieldName]: value } },
              { terms: { [OTEL_BROWSER_OS]: value } },
            ],
            minimum_should_match: 1,
          },
        };
      }

      return {
        terms: {
          [field.fieldName]: value,
        },
      };
    }) as ESFilter[];

  return [
    ...mappedFilters,
    ...(exclude ? [] : environmentQuery(uiFilters.environment || ENVIRONMENT_ALL.value)),
  ];
}
