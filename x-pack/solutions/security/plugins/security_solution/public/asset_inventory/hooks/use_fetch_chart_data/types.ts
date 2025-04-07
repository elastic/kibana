/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseEsQuery } from '@kbn/cloud-security-posture';
import type { ASSET_FIELDS } from '../../constants';

export interface AssetInventoryChartData {
  [ASSET_FIELDS.ENTITY_TYPE]: string;
  [ASSET_FIELDS.ENTITY_SUB_TYPE]: string;
  count: number;
}

export interface UseTopAssetsOptions extends BaseEsQuery {
  sort: string[][];
  enabled: boolean;
}
