/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type {
  InventoryCellScalar,
  InventoryCellValue,
  InventoryListColumn,
  InventoryRow,
} from '../../../inventory_api/types';
import type { EntityInventoryEntityCategory } from '../../../types';
import { getFirstScalar } from '../../utils/get_first_scalar';

/** The entity type each page lists. All resources lists groups instead (#6340). */
export const ENTITY_TYPE_BY_CATEGORY: Readonly<
  Partial<Record<EntityInventoryEntityCategory, string>>
> = {
  hosts: 'host',
  kubernetes: 'k8s.deployment',
};

/**
 * Id of the app-side Name column. It is not an output column name; an attribute with the same
 * name would collide with it.
 */
export const NAME_COLUMN_ID = 'entityInventory.name';

/** Id of the app-side Namespace column, which merges the namespace of both naming conventions. */
export const NAMESPACE_COLUMN_ID = 'entityInventory.namespace';

/**
 * Id of the app-side Cluster column, which merges the cluster of both naming conventions. The
 * cluster is an identity field of the type, so no attribute can stand in for it.
 */
export const CLUSTER_COLUMN_ID = 'entityInventory.cluster';

export interface EntityTypeDisplayConfig {
  iconType: IconType;
  /** Columns tried in order for the Name column. */
  nameFields: readonly string[];
  /**
   * App-side columns that show the first value among several output columns, keyed by column id.
   * They sit after the Name column, for entities reported under more than one naming convention.
   */
  mergedColumns: Readonly<Record<string, readonly string[]>>;
  /**
   * Columns listed first in the column menu, in order, from the design's list of all possible
   * columns. The remaining columns follow in response order.
   */
  columnOrder: readonly string[];
  /** Columns visible by default, in order; `undefined` shows every attribute. */
  defaultVisibleColumns?: readonly string[];
  /** Columns whose values render as badges, for values that name a group such as a cluster. */
  badgeColumns: readonly string[];
}

/**
 * Interim display settings per entity type, bridging the response to the default views design.
 *
 * TODO: Delete each setting once the definition provides it. The name fields and merged columns
 * stand in for fields that arrive once per naming convention, and the default and ordered
 * columns come from the design, not the response. The definition thread is open:
 * https://github.com/elastic/kibana/pull/303101#discussion_r4477715741
 */
const ENTITY_TYPE_DISPLAY_CONFIG: Readonly<Record<string, Partial<EntityTypeDisplayConfig>>> = {
  host: {
    iconType: 'compute',
    nameFields: ['host.name', 'host.hostname', 'host.id', 'entity.id'],
    // Last seen stands in for Up time until the metrics exist. The spec's host Type has no
    // attribute in the host definition yet (see the decision log).
    defaultVisibleColumns: [NAME_COLUMN_ID, 'cloud.account.id', 'last_seen'],
    columnOrder: [NAME_COLUMN_ID, 'cloud.account.id', 'last_seen', 'cloud.provider'],
  },
  'k8s.deployment': {
    iconType: 'logoKubernetes',
    nameFields: ['k8s.deployment.name', 'kubernetes.deployment.name', 'entity.id'],
    mergedColumns: {
      [NAMESPACE_COLUMN_ID]: ['k8s.namespace.name', 'kubernetes.namespace'],
      [CLUSTER_COLUMN_ID]: ['k8s.cluster.name', 'orchestrator.cluster.name'],
    },
    // The design has no k8s.deployment row. The menu order follows its K8s namespace row: Name,
    // then Cluster.
    columnOrder: [
      NAME_COLUMN_ID,
      CLUSTER_COLUMN_ID,
      NAMESPACE_COLUMN_ID,
      'available_replicas',
      'last_seen',
    ],
    // Last seen stands in for Restarts and Up time until the metrics exist (#6272).
    defaultVisibleColumns: [
      NAME_COLUMN_ID,
      NAMESPACE_COLUMN_ID,
      CLUSTER_COLUMN_ID,
      'available_replicas',
      'last_seen',
    ],
    badgeColumns: [CLUSTER_COLUMN_ID],
  },
};

const DEFAULT_DISPLAY_CONFIG: EntityTypeDisplayConfig = {
  iconType: 'grid',
  nameFields: ['entity.id'],
  mergedColumns: {},
  columnOrder: [],
  badgeColumns: [],
};

/** Display settings of an entity type: its own settings over the defaults for unconfigured ones. */
export const getDisplayConfig = (type: string): EntityTypeDisplayConfig => ({
  ...DEFAULT_DISPLAY_CONFIG,
  ...ENTITY_TYPE_DISPLAY_CONFIG[type],
});

/** The columns visible by default, limited to the columns the response has. */
export const getDefaultVisibleColumns = (
  type: string,
  columns: readonly InventoryListColumn[]
): string[] => {
  const { defaultVisibleColumns, mergedColumns } = getDisplayConfig(type);
  if (!defaultVisibleColumns) {
    return [
      NAME_COLUMN_ID,
      ...columns.filter(({ kind }) => kind === 'attribute').map(({ name }) => name),
      ...columns.filter(({ kind }) => kind === 'last_seen').map(({ name }) => name),
    ];
  }
  const available = new Set(columns.map(({ name }) => name));
  return defaultVisibleColumns.filter(
    (id) => id === NAME_COLUMN_ID || id in mergedColumns || available.has(id)
  );
};

/**
 * The ids of every column of the grid, in column menu order: the type's `columnOrder` first, then
 * the Name column, the merged columns and the response columns that it leaves out.
 */
export const getColumnIds = (type: string, columns: readonly InventoryListColumn[]): string[] => {
  const { columnOrder, mergedColumns } = getDisplayConfig(type);
  const all = [NAME_COLUMN_ID, ...Object.keys(mergedColumns), ...columns.map(({ name }) => name)];
  const ordered = columnOrder.filter((id) => all.includes(id));
  return [...ordered, ...all.filter((id) => !ordered.includes(id))];
};

/** The first value among `fields` of a row, or `null`. */
export const getFirstValue = (
  row: InventoryRow,
  fields: readonly string[]
): InventoryCellScalar => {
  for (const field of fields) {
    const scalar = getFirstScalar(row[field]);
    if (scalar !== null) {
      return scalar;
    }
  }
  return null;
};

/** The value of a grid column: the Name and merged columns are derived, any other is a row field. */
export const getColumnValue = (
  row: InventoryRow,
  columnId: string,
  { nameFields, mergedColumns }: Pick<EntityTypeDisplayConfig, 'nameFields' | 'mergedColumns'>
): InventoryCellValue | undefined => {
  if (columnId === NAME_COLUMN_ID) {
    return getFirstValue(row, nameFields);
  }
  if (columnId in mergedColumns) {
    return getFirstValue(row, mergedColumns[columnId]);
  }
  return row[columnId];
};
