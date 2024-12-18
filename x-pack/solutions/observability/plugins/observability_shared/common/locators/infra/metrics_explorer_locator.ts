/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

export type MetricsExplorerLocator = LocatorPublic<MetricsExplorerLocatorParams>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetricsExplorerLocatorParams extends SerializableRecord {}

export const METRICS_EXPLORER_LOCATOR_ID = 'METRICS_EXPLORER_LOCATOR';

export class MetricsExplorerLocatorDefinition
  implements LocatorDefinition<MetricsExplorerLocatorParams>
{
  public readonly id = METRICS_EXPLORER_LOCATOR_ID;

  public readonly getLocation = async (params: MetricsExplorerLocatorParams) => {
    return {
      app: 'metrics',
      path: `/explorer`,
      state: {},
    };
  };
}
