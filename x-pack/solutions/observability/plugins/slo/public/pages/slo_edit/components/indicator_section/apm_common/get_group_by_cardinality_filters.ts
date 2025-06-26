/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ALL_VALUE, FiltersSchema } from '@kbn/slo-schema';
import { FilterStateStore } from '@kbn/es-query';

export const getGroupByCardinalityFilters = ({
  serviceName,
  environment,
  transactionType,
  transactionName,
}: {
  serviceName: string;
  environment?: string;
  transactionType?: string;
  transactionName?: string;
}): FiltersSchema => {
  const serviceNameFilter =
    serviceName && serviceName !== ALL_VALUE
      ? {
          meta: {
            disabled: false,
            negate: false,
            alias: null,
            key: 'service.name',
            params: serviceName,
            type: 'phrases',
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: {
                match_phrase: {
                  'service.name': serviceName,
                },
              },
            },
          },
        }
      : null;

  const environmentFilter =
    environment && environment !== ALL_VALUE
      ? {
          meta: {
            disabled: false,
            negate: false,
            alias: null,
            key: 'service.environment',
            params: environment,
            type: 'phrases',
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: {
                match_phrase: {
                  'service.environment': environment,
                },
              },
            },
          },
        }
      : null;

  const transactionTypeFilter =
    transactionType && transactionType !== ALL_VALUE
      ? {
          meta: {
            disabled: false,
            negate: false,
            alias: null,
            key: 'transaction.type',
            params: transactionType,
            type: 'phrases',
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: {
                match_phrase: {
                  'transaction.type': transactionType,
                },
              },
            },
          },
        }
      : null;

  const transactionNameFilter =
    transactionName && transactionName !== ALL_VALUE
      ? {
          meta: {
            disabled: false,
            negate: false,
            alias: null,
            key: 'transaction.name',
            params: transactionName,
            type: 'phrases',
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
          query: {
            bool: {
              minimum_should_match: 1,
              should: {
                match_phrase: {
                  'transaction.name': transactionName,
                },
              },
            },
          },
        }
      : null;

  return [
    serviceNameFilter,
    environmentFilter,
    transactionTypeFilter,
    transactionNameFilter,
  ].filter((value) => !!value) as FiltersSchema;
};
