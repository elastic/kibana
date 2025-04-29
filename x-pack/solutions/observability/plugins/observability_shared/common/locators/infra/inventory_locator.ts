/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';
import rison from '@kbn/rison';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import querystring from 'querystring';

export type InventoryLocator = LocatorPublic<InventoryLocatorParams>;

export interface InventoryLocatorParams extends SerializableRecord {
  inventoryViewId?: string;
  waffleFilter?: {
    expression: string;
    kind: string;
  };
  waffleTime?: {
    currentTime: number;
    isAutoReloading: boolean;
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
  sort?: {
    by: string;
    direction: 'desc' | 'async';
  };
  timelineOpen?: boolean;
  view?: 'map' | 'table';
  state?: SerializableRecord;
}

export const INVENTORY_LOCATOR_ID = 'INVENTORY_LOCATOR';

export class InventoryLocatorDefinition implements LocatorDefinition<InventoryLocatorParams> {
  public readonly id = INVENTORY_LOCATOR_ID;

  public readonly getLocation = async (params: InventoryLocatorParams) => {
    const paramsWithDefaults = {
      waffleFilter: rison.encodeUnknown(params.waffleFilter ?? { kind: 'kuery', expression: '' }),
      waffleTime: rison.encodeUnknown(
        params.waffleTime ?? {
          currentTime: new Date().getTime(),
          isAutoReloading: false,
        }
      ),
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
      region: rison.encodeUnknown(params.region ?? ''),
      sort: rison.encodeUnknown(params.sort ?? { by: 'name', direction: 'desc' }),
      timelineOpen: rison.encodeUnknown(params.timelineOpen ?? false),
      view: rison.encodeUnknown(params.view ?? 'map'),
    };

    const queryStringParams = querystring.stringify(paramsWithDefaults);
    return {
      app: 'metrics',
      path: `/inventory?${queryStringParams}`,
      state: params.state ? params.state : {},
    };
  };
}
