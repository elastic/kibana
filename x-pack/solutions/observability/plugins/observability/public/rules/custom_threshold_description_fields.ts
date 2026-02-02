/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { CustomThresholdParams } from '@kbn/response-ops-rule-params/custom_threshold/latest';

export const getDescriptionFields: GetDescriptionFieldsFn<CustomThresholdParams> = ({
  rule,
  prebuildFields,
}) => {
  if (!rule || !prebuildFields) return [];

  const searchConfig = rule.params.searchConfiguration;
  if (!searchConfig) return [];

  const fields = [];

  if (typeof searchConfig.index === 'string') {
    fields.push(prebuildFields.dataViewIndexPattern(searchConfig.index));
  }

  if (searchConfig.query.query) {
    fields.push(prebuildFields.customQuery(searchConfig.query.query));
  }

  if (searchConfig.filter && typeof searchConfig.index === 'string') {
    fields.push(
      prebuildFields.queryFilters({ filters: searchConfig.filter, dataViewId: searchConfig.index })
    );
  }

  return fields;
};
