/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ASSET_CRITICALITY_INDEX_BASE = '.asset-criticality.asset-criticality';

export const getAssetCriticalityIndex = (namespace: string) =>
  `${ASSET_CRITICALITY_INDEX_BASE}-${namespace}`;
