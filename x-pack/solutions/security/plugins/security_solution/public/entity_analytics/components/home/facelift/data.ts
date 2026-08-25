/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable import path for facelift mock entity data.
 * Implementation lives in `./v1`–`./v5`; keep this file as a thin bridge so
 * external call sites do not hard-code a version folder.
 * v.3+ re-export v.2's corpus so mocks stay shared.
 */

import { getActiveFaceliftVersion } from './active_version';
import * as v1 from './v1/data';
import * as v2 from './v2/data';
import * as v3 from './v3/data';
import * as v4 from './v4/data';
import * as v5 from './v5/data';

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

/** Flag is identical across versions today; re-exported for existing call sites. */
export const USE_FACELIFT_MOCK_ENTITIES = v2.USE_FACELIFT_MOCK_ENTITIES;

export type FaceliftRiskLevel = v2.FaceliftRiskLevel;
export type CriticalityTier = v2.CriticalityTier;
export type TableView = v2.TableView;
export type SignalCardId = v2.SignalCardId;
export type SignalCardData = v2.SignalCardData;
export type FaceliftRawRecord = v2.FaceliftRawRecord;
export type FaceliftIdentity = v2.FaceliftIdentity;
export type ActiveFilter = v2.ActiveFilter;
export type PageFilters = v2.PageFilters;
export type FaceliftEntityEsHit = v2.FaceliftEntityEsHit;

export const EMPTY_PAGE_FILTERS = v2.EMPTY_PAGE_FILTERS;

export const getEntityStoreEsHits = (
  ...args: Parameters<typeof v2.getEntityStoreEsHits>
): ReturnType<typeof v2.getEntityStoreEsHits> => impl().getEntityStoreEsHits(...args);
