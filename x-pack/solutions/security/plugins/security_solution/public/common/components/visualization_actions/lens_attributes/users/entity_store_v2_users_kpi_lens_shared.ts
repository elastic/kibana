/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

/** Stable id for users KPI ad-hoc data view (Entity Store v2 unified latest index). */
export const ENTITY_STORE_V2_USERS_KPI_LENS_AD_HOC_ID = 'b8e3f2a1-6c4d-5e7f-8a9b-0c1d2e3f4a5b';

export const getEntityStoreV2UserOnlyFilter = (): Filter => ({
  meta: {
    alias: null,
    disabled: false,
    negate: false,
    type: 'phrase',
    key: 'entity.EngineMetadata.Type',
    params: { query: 'user' },
    index: ENTITY_STORE_V2_USERS_KPI_LENS_AD_HOC_ID,
  },
  query: {
    match_phrase: {
      'entity.EngineMetadata.Type': 'user',
    },
  },
});
