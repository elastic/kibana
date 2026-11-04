/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type {
  InventoryCellScalar,
  InventoryListColumn,
  InventoryRow,
} from '../../../inventory_api/types';
import type { EntityInventoryEntityCategory } from '../../../types';

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

export interface EntityTypeDisplayConfig {
  iconType: IconType;
  /** Columns tried in order for the Name column. */
  nameFields: readonly string[];
  /** Columns visible by default, in order; `undefined` shows every attribute. */
  defaultVisibleColumns?: readonly string[];
  /** Columns whose values render as badges, for values that name a group such as a cluster. */
  badgeColumns: readonly string[];
}

const ENTITY_TYPE_DISPLAY_CONFIG: Readonly<Record<string, Partial<EntityTypeDisplayConfig>>> = {
  host: {
    iconType: 'compute',
    nameFields: ['host.name', 'host.hostname', 'host.id', 'entity.id'],
    defaultVisibleColumns: [
      NAME_COLUMN_ID,
      'host.ip',
      'os.name',
      'os.version',
      'host.arch',
      'cloud.provider',
      'cloud.region',
      'k8s.cluster.name',
      'last_seen',
    ],
  },
  'k8s.deployment': {
    iconType: 'logoKubernetes',
    nameFields: ['kubernetes.deployment.name', 'entity.id'],
    defaultVisibleColumns: [NAME_COLUMN_ID, 'kubernetes.namespace', 'cluster', 'last_seen'],
    badgeColumns: ['cluster'],
  },
};

const DEFAULT_DISPLAY_CONFIG: EntityTypeDisplayConfig = {
  iconType: 'grid',
  nameFields: ['entity.id'],
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
  const { defaultVisibleColumns } = getDisplayConfig(type);
  if (!defaultVisibleColumns) {
    return [
      NAME_COLUMN_ID,
      ...columns.filter(({ kind }) => kind === 'attribute').map(({ name }) => name),
      ...columns.filter(({ kind }) => kind === 'last_seen').map(({ name }) => name),
    ];
  }
  const available = new Set(columns.map(({ name }) => name));
  return defaultVisibleColumns.filter((id) => id === NAME_COLUMN_ID || available.has(id));
};

/** The display name of an entity: the first value among `nameFields`, or `null`. */
export const getEntityName = (
  row: InventoryRow,
  nameFields: readonly string[]
): InventoryCellScalar => {
  for (const field of nameFields) {
    const value = row[field];
    const scalar = Array.isArray(value) ? value[0] : value;
    if (scalar !== null && scalar !== undefined) {
      return scalar;
    }
  }
  return null;
};
