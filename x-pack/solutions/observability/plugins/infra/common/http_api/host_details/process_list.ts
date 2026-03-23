/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MetricsAPISeriesRT, type MetricsAPIRow } from '@kbn/metrics-data-access-plugin/common';
import { DataSchemaFormatRT } from '../shared';

export const ProcessListAPIRequestRT = rt.type({
  hostTerm: rt.record(rt.string, rt.string),
  sourceId: rt.string,
  to: rt.number,
  sortBy: rt.type({
    name: rt.string,
    isAscending: rt.boolean,
  }),
  searchFilter: rt.array(rt.record(rt.string, rt.record(rt.string, rt.unknown))),
  schema: rt.union([DataSchemaFormatRT, rt.null]),
});

// string in case of 'N?A'
const summaryPropertyRT = rt.union([rt.number, rt.string]);

export const ProcessListAPIResponseRT = rt.type({
  processList: rt.array(
    rt.type({
      cpu: rt.union([rt.null, rt.number]),
      memory: rt.union([rt.null, rt.number]),
      startTime: rt.union([rt.null, rt.number]),
      pid: rt.number,
      state: rt.string,
      user: rt.string,
      command: rt.string,
    })
  ),
  summary: rt.exact(
    rt.partial({
      total: summaryPropertyRT,
      running: summaryPropertyRT,
      sleeping: summaryPropertyRT,
      dead: summaryPropertyRT,
      stopped: summaryPropertyRT,
      idle: summaryPropertyRT,
      zombie: summaryPropertyRT,
      unknown: summaryPropertyRT,
    })
  ),
});

export type ProcessListAPIRequest = rt.TypeOf<typeof ProcessListAPIRequestRT>;

export type ProcessListAPIResponse = rt.TypeOf<typeof ProcessListAPIResponseRT>;

export const ProcessListAPIChartRequestRT = rt.type({
  hostTerm: rt.record(rt.string, rt.string),
  indexPattern: rt.string,
  to: rt.number,
  command: rt.string,
  schema: rt.union([DataSchemaFormatRT, rt.null]),
});

export const ProcessListAPIChartResponseRT = rt.type({
  cpu: MetricsAPISeriesRT,
  memory: MetricsAPISeriesRT,
});

export type ProcessListAPIChartRequest = rt.TypeOf<typeof ProcessListAPIChartRequestRT>;

export type ProcessListAPIChartResponse = rt.TypeOf<typeof ProcessListAPIChartResponseRT>;

export type ProcessListAPIRow = MetricsAPIRow;
