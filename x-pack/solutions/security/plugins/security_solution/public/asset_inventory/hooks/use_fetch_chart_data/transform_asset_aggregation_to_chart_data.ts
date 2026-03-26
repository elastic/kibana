/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ASSET_FIELDS } from '../../constants';
import type { AssetInventoryChartData } from './types';

interface SubTypeBucket {
  key: string;
  doc_count: number;
  entityId: { value: number };
}

interface TypeBucket {
  key: string;
  doc_count: number;
  entityId: { value: number };
  entitySubType: {
    buckets: SubTypeBucket[];
    sum_other_doc_count: number;
  };
}

export interface AssetAggs {
  entityType: {
    buckets: TypeBucket[];
  };
}

const tooltipOtherLabel = i18n.translate(
  'xpack.securitySolution.assetInventory.chart.tooltip.otherLabel',
  {
    defaultMessage: 'Other',
  }
);

const UNCATEGORIZED_LABEL = i18n.translate(
  'xpack.securitySolution.assetInventory.chart.uncategorizedLabel',
  { defaultMessage: 'uncategorized' }
);

export function transformAssetAggregationToChartData(agg: AssetAggs): AssetInventoryChartData[] {
  const result: AssetInventoryChartData[] = [];

  for (const typeBucket of agg.entityType.buckets) {
    for (const subtypeBucket of typeBucket.entitySubType.buckets) {
      // Format "Uncategorized" labels to include the entity type
      const formattedSubType =
        subtypeBucket.key === 'Uncategorized'
          ? `${typeBucket.key} (${UNCATEGORIZED_LABEL})`
          : subtypeBucket.key;

      result.push({
        [ASSET_FIELDS.ENTITY_TYPE]: typeBucket.key,
        [ASSET_FIELDS.ENTITY_SUB_TYPE]: formattedSubType,
        count: subtypeBucket.doc_count,
      });
    }

    if (typeBucket.entitySubType.sum_other_doc_count > 0) {
      result.push({
        [ASSET_FIELDS.ENTITY_TYPE]: typeBucket.key,
        [ASSET_FIELDS.ENTITY_SUB_TYPE]: `${typeBucket.key} - ${tooltipOtherLabel}`,
        count: typeBucket.entitySubType.sum_other_doc_count,
      });
    }
  }

  return result;
}
