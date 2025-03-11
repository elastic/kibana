/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import type { Filter } from '@kbn/es-query';

import { EXCLUDED_DATA_TIERS_FOR_RULE_EXECUTION } from '../../../../../common/constants';

/**
 * reads Kibana advanced settings for filtering data tiers during rule executions
 * returns {@link Filter} array
 */
export const getDataTierFilter = async ({
  uiSettingsClient,
}: {
  uiSettingsClient: IUiSettingsClient;
}): Promise<Filter[]> => {
  const excludedTiers = await uiSettingsClient.get<Array<'data_cold' | 'data_frozen'>>(
    EXCLUDED_DATA_TIERS_FOR_RULE_EXECUTION
  );

  if (!excludedTiers?.length) {
    return [];
  }

  return [
    {
      meta: { negate: true },
      query: {
        terms: {
          _tier: excludedTiers,
        },
      },
    },
  ];
};
