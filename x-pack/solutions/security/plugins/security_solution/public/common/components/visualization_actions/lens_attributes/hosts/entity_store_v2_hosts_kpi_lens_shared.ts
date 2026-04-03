/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

/** Stable id for ad-hoc data view (Entity Store v2 unified latest index). */
export const ENTITY_STORE_V2_HOSTS_KPI_LENS_AD_HOC_ID = '7f2a9c1e-4b8d-4e6f-a3c2-9d1e8f7a6b5c';

export const getEntityStoreV2LatestHostsIndexTitle = (spaceId?: string) =>
  `.entities.v2.latest.security_${spaceId ?? 'default'}`;

export const getEntityStoreV2HostOnlyFilter = (): Filter => ({
  meta: {
    alias: null,
    disabled: false,
    negate: false,
    type: 'phrase',
    key: 'entity.EngineMetadata.Type',
    params: { query: 'host' },
    index: ENTITY_STORE_V2_HOSTS_KPI_LENS_AD_HOC_ID,
  },
  query: {
    match_phrase: {
      'entity.EngineMetadata.Type': 'host',
    },
  },
});
