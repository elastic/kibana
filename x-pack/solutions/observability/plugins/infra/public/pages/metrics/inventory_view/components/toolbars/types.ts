/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { InventoryCloudAccount } from '../../../../../../common/http_api/inventory_meta_api';
import type {
  SnapshotCustomMetricInput,
  SnapshotGroupBy,
  SnapshotMetricInput,
} from '../../../../../../common/http_api/snapshot_api';
import type { InfraGroupByOptions } from '../../../../../common/inventory/types';
import type { WaffleOptionsState, WaffleSortOption } from '../../hooks/use_waffle_options';

export interface ToolbarProps extends Omit<WaffleOptionsState, 'boundsOverride' | 'autoBounds'> {
  changeMetric: (payload: SnapshotMetricInput) => void;
  changeGroupBy: (payload: SnapshotGroupBy) => void;
  changeCustomOptions: (payload: InfraGroupByOptions[]) => void;
  changeAccount: (id: string) => void;
  changeRegion: (name: string) => void;
  changeSort: (sort: WaffleSortOption) => void;
  accounts: InventoryCloudAccount[];
  regions: string[];
  changeCustomMetrics: (payload: SnapshotCustomMetricInput[]) => void;
  changePreferredSchema: (preferredSchema: DataSchemaFormat | null) => void;
}
