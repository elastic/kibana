/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';
import rison from '@kbn/rison';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import querystring from 'querystring';
import type { DataSchemaFormat } from './hosts_locator';

export type InventoryLocator = LocatorPublic<InventoryLocatorParams>;

export interface InventoryLocatorParams extends SerializableRecord {
  inventoryViewId?: string;
  waffleFilter?: {
    expression: string;
    kind: string;
  };
  /** @deprecated Use `dateRange` instead. Kept for backward compatibility with existing alert links. */
  waffleTime?:
    | {
        from: string;
        to: string;
      }
    | {
        currentTime: number;
        isAutoReloading: boolean;
      };
  dateRange?: {
    from: string;
    to: string;
  };
  waffleOptions?: {
    accountId: string;
    autoBounds: boolean;
    boundsOverride: {
      max: number;
      min: number;
    };
  };
  customMetrics?: string; // encoded value
  customOptions?: string; // encoded value
  groupBy?: { field: string };
  legend?: {
    palette: string;
    reverseColors: boolean;
    steps: number;
  };
  metric: string; // encoded value
  nodeType: string;
  region?: string;

  preferredSchema?: DataSchemaFormat | null;
  sort?: {
    by: string;
    direction: 'desc' | 'async';
  };
  timelineOpen?: boolean;
  view?: 'map' | 'table';
  state?: SerializableRecord;
}

export const INVENTORY_LOCATOR_ID = 'INVENTORY_LOCATOR';

function resolveTimeRange(params: InventoryLocatorParams): { from: string; to: string } {
  if (params.dateRange) {
    return params.dateRange;
  }
  if (params.waffleTime) {
    if ('from' in params.waffleTime) {
      return params.waffleTime;
    }
    return {
      from: new Date(params.waffleTime.currentTime - 15 * 60 * 1000).toISOString(),
      to: new Date(params.waffleTime.currentTime).toISOString(),
    };
  }
  return { from: 'now-15m', to: 'now' };
}

export class InventoryLocatorDefinition implements LocatorDefinition<InventoryLocatorParams> {
  public readonly id = INVENTORY_LOCATOR_ID;

  public readonly getLocation = async (params: InventoryLocatorParams) => {
    const timeRange = resolveTimeRange(params);

    const paramsWithDefaults = {
      waffleFilter: rison.encodeUnknown(params.waffleFilter ?? { kind: 'kuery', expression: '' }),
      waffleOptions: rison.encodeUnknown(
        params.waffleOptions ?? {
          accountId: '',
          autoBounds: true,
          boundsOverride: { max: 1, min: 0 },
        }
      ),
      customMetrics: params.customMetrics,
      customOptions: params.customOptions,
      groupBy: rison.encodeUnknown(params.groupBy ?? {}),
      legend: rison.encodeUnknown(
        params.legend ?? { palette: 'cool', reverseColors: false, steps: 10 }
      ),
      metric: params.metric,
      nodeType: rison.encodeUnknown(params.nodeType),
      preferredSchema: rison.encodeUnknown(params.preferredSchema),
      region: rison.encodeUnknown(params.region ?? ''),
      sort: rison.encodeUnknown(params.sort ?? { by: 'name', direction: 'desc' }),
      timelineOpen: rison.encodeUnknown(params.timelineOpen ?? false),
      view: rison.encodeUnknown(params.view ?? 'map'),
      _a: rison.encodeUnknown({ dateRange: timeRange }),
    };

    const queryStringParams = querystring.stringify(paramsWithDefaults);
    return {
      app: 'metrics',
      path: `/inventory?${queryStringParams}`,
      state: params.state ? params.state : {},
    };
  };
}
