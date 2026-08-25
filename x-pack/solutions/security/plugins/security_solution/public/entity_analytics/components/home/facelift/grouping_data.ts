/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable import path for facelift grouping / grid mock helpers.
 * Routes to the active version snapshot under `./v1`–`./v5`.
 */

import { getActiveFaceliftVersion } from './active_version';
import * as v1 from './v1/grouping_data';
import * as v2 from './v2/grouping_data';
import * as v3 from './v3/grouping_data';
import * as v4 from './v4/grouping_data';
import * as v5 from './v5/grouping_data';

const impl = () => {
  switch (getActiveFaceliftVersion()) {
    case 'v1':
      return v1;
    case 'v2':
      return v2;
    case 'v3':
      return v3;
    case 'v4':
      return v4;
    case 'v5':
      return v5;
  }
};

export const filterHitsByEsQuery = (
  ...args: Parameters<typeof v2.filterHitsByEsQuery>
): ReturnType<typeof v2.filterHitsByEsQuery> => impl().filterHitsByEsQuery(...args);

export const getSortedEntityStoreHits = (
  ...args: Parameters<typeof v2.getSortedEntityStoreHits>
): ReturnType<typeof v2.getSortedEntityStoreHits> => impl().getSortedEntityStoreHits(...args);

export const getFaceliftGroupingAggregations = (
  ...args: Parameters<typeof v2.getFaceliftGroupingAggregations>
): ReturnType<typeof v2.getFaceliftGroupingAggregations> =>
  impl().getFaceliftGroupingAggregations(...args);

export const getFaceliftTargetMetadata = (
  ...args: Parameters<typeof v2.getFaceliftTargetMetadata>
): ReturnType<typeof v2.getFaceliftTargetMetadata> => impl().getFaceliftTargetMetadata(...args);
