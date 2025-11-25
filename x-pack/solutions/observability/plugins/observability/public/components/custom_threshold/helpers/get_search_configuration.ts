/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { isOfQueryType } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { CustomThresholdSearchSourceFields } from '../../../../common/custom_threshold_rule/types';

export const defaultQuery: Query = {
  language: 'kuery',
  query: '',
};

const searchConfigQueryWarning = i18n.translate(
  'xpack.observability.customThreshold.rule.alertFlyout.searchConfiguration.queryWarning',
  {
    defaultMessage:
      'Custom threshold does not support queries other than Query type, query was changed to default query.',
  }
);

export const getSearchConfiguration = (
  fields: SerializedSearchSourceFields,
  onWarning: (title: string) => void
): CustomThresholdSearchSourceFields => {
  if (fields.query && !isOfQueryType(fields.query)) {
    onWarning(searchConfigQueryWarning);
    return adjustSearchConfiguration({
      ...fields,
      query: defaultQuery,
    });
  }
  return adjustSearchConfiguration({
    ...fields,
    query: fields.query,
  });
};

const omitManaged = <T extends { managed?: unknown }>({ managed, ...rest }: T) => rest;

const adjustSearchConfiguration = (
  searchConfiguration: CustomThresholdSearchSourceFields
): CustomThresholdSearchSourceFields => {
  // Only meta and query fields are saved in the rule params, so we ignore other fields such as $state
  const filter = searchConfiguration.filter
    ? searchConfiguration.filter.map(({ meta, query }) => ({ meta, query }))
    : undefined;

  // Remove the 'managed' field from data view spec if index is an object
  // The 'managed' field is not needed in rule params and is not part of the validated schema
  const index =
    searchConfiguration.index && typeof searchConfiguration.index === 'object'
      ? omitManaged(searchConfiguration.index)
      : searchConfiguration.index;

  return {
    ...searchConfiguration,
    index,
    filter,
  };
};
