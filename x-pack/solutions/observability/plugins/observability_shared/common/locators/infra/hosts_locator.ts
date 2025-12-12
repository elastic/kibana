/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';
import rison from '@kbn/rison';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import type { Filter } from '@kbn/es-query';

export type HostsLocator = LocatorPublic<HostsLocatorParams>;
export type DataSchemaFormat = 'ecs' | 'semconv';

export interface HostsLocatorParams extends SerializableRecord {
  query?: {
    language: string;
    query: string;
  };
  dateRange?: {
    from: string;
    to: string;
  };
  filters?: Filter[];
  panelFilters?: Filter[];
  limit?: number;
  preferredSchema?: DataSchemaFormat | null;
  tableProperties?: {
    detailsItemId?: string;
    pagination: {
      pageIndex: number;
      pageSize: number;
    };
    sorting: {
      direction?: string;
      field: string;
    };
  };
}

export const HOSTS_LOCATOR_ID = 'HOSTS_LOCATOR';
const DEFAULT_HOST_LIMIT = 100;

export class HostsLocatorDefinition implements LocatorDefinition<HostsLocatorParams> {
  public readonly id = HOSTS_LOCATOR_ID;

  public readonly getLocation = async (params: HostsLocatorParams) => {
    const paramsWithDefaults = {
      query: params.query ?? { language: 'kuery', query: '' },
      dateRange: params.dateRange ?? { from: 'now-15m', to: 'now' },
      filters: params.filters ?? [],
      panelFilters: params.panelFilters ?? [],
      limit: params.limit ?? DEFAULT_HOST_LIMIT,
      preferredSchema: params.preferredSchema ?? null,
    };
    const searchString = rison.encodeUnknown(paramsWithDefaults);
    const tableProperties = rison.encodeUnknown(params.tableProperties);
    return {
      app: 'metrics',
      path: `/hosts?_a=${searchString}&tableProperties=${tableProperties}`,
      state: {},
    };
  };
}
