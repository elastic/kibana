/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_PREBUILD_DESCRIPTION_FIELDS } from '@kbn/triggers-actions-ui-plugin/public';
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
    fields.push(
      prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN](searchConfig.index)
    );
  }

  fields.push(
    prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY](searchConfig.query.query)
  );

  return fields;
};
