/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchConfigurationType } from '@kbn/response-ops-rule-params/common';
import { RULE_PREBUILD_DESCRIPTION_FIELDS } from '@kbn/triggers-actions-ui-plugin/public';
import type { GetDescriptionFieldsFn, Rule } from '@kbn/triggers-actions-ui-plugin/public/types';

export const getDescriptionFields: GetDescriptionFieldsFn<
  Omit<Rule, 'searchConfiguration'> & { searchConfiguration: SearchConfigurationType }
> = ({ rule, prebuildFields }) => {
  if (!rule || !prebuildFields) return [];

  const searchConfig = rule.params.searchConfiguration;
  if (!searchConfig) return [];

  const fields = [];

  if (searchConfig.index) {
    fields.push(
      prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.DATA_VIEW_INDEX_PATTERN](searchConfig.index)
    );
  }

  if (typeof searchConfig.query.query === 'string') {
    fields.push(
      prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY](searchConfig.query.query)
    );
  }

  return fields;
};
