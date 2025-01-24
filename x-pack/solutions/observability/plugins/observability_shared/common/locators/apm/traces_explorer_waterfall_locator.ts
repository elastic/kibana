/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  TRACES_EXPLORER_WATERFALL_LOCATOR,
  type TracesExplorerWaterfallLocatorParams,
} from '@kbn/deeplinks-observability';

export { TRACES_EXPLORER_WATERFALL_LOCATOR, type TracesExplorerWaterfallLocatorParams };

export type TracesExplorerWaterfallLocator = LocatorPublic<TracesExplorerWaterfallLocatorParams>;

export class TracesExplorerWaterfallLocatorDefinition
  implements LocatorDefinition<TracesExplorerWaterfallLocatorParams>
{
  public readonly id = TRACES_EXPLORER_WATERFALL_LOCATOR;

  public readonly getLocation = async ({
    rangeFrom,
    rangeTo,
    serviceName,
    errorId,
    spanId,
  }: TracesExplorerWaterfallLocatorParams) => {
    const queryParams = [];
    if (errorId) queryParams.push(`error.id:"${errorId}"`);
    if (spanId) queryParams.push(`span.id:"${spanId}"`);
    const query = queryParams.join('&');

    const params = { rangeFrom, rangeTo, serviceName, query };
    return {
      app: 'apm',
      path: `/link-to/traces/explorer/waterfall?${qs.stringify(params)}`,
      state: {},
    };
  };
}
