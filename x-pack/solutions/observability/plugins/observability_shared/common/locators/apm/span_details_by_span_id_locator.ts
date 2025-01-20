/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  SPAN_DETAILS_BY_SPAN_ID_AND_TRACE_ID_LOCATOR,
  type SpanDetailsBySpanIdAndTraceIdLocatorParams,
} from '@kbn/deeplinks-observability';

export {
  SPAN_DETAILS_BY_SPAN_ID_AND_TRACE_ID_LOCATOR,
  type SpanDetailsBySpanIdAndTraceIdLocatorParams,
};

export type SpanDetailsBySpanIdAndTraceIdLocator =
  LocatorPublic<SpanDetailsBySpanIdAndTraceIdLocatorParams>;

export class SpanDetailsBySpanIdAndTraceIdLocatorDefinition
  implements LocatorDefinition<SpanDetailsBySpanIdAndTraceIdLocatorParams>
{
  public readonly id = SPAN_DETAILS_BY_SPAN_ID_AND_TRACE_ID_LOCATOR;

  public readonly getLocation = async ({
    rangeFrom,
    rangeTo,
    spanId,
    traceId,
  }: SpanDetailsBySpanIdAndTraceIdLocatorParams) => {
    const params = { rangeFrom, rangeTo, waterfallItemId: spanId };
    return {
      app: 'apm',
      path: `/link-to/trace/${encodeURIComponent(traceId)}?${qs.stringify(params)}`,
      state: {},
    };
  };
}
