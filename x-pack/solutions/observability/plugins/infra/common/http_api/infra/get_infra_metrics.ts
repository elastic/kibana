/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLiteralValueFromUndefinedRT, inRangeRt, isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { EntityTypeRT } from '../shared/entity_type';

export const InfraMetricTypeRT = rt.keyof({
  cpu: null,
  cpuV2: null,
  normalizedLoad1m: null,
  diskSpaceUsage: null,
  memory: null,
  memoryFree: null,
  rx: null,
  tx: null,
  rxV2: null,
  txV2: null,
});

export const InfraEntityMetadataTypeRT = rt.keyof({
  'cloud.provider': null,
  'host.ip': null,
  'host.os.name': null,
});

export const InfraEntityMetricsRT = rt.type({
  name: InfraMetricTypeRT,
  value: rt.union([rt.number, rt.null]),
});

export const InfraEntityMetadataRT = rt.type({
  // keep the actual field name from the index mappings
  name: InfraEntityMetadataTypeRT,
  value: rt.union([rt.number, rt.string, rt.null]),
});

export const GetInfraMetricsRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
  }),
  rt.type({
    limit: rt.union([inRangeRt(1, 500), createLiteralValueFromUndefinedRT(500)]),
    metrics: rt.array(InfraMetricTypeRT),
    from: isoToEpochRt,
    to: isoToEpochRt,
  }),
]);

export const GetInfraMetricsRequestParamsRT = EntityTypeRT;

export const InfraEntityMetricsItemRT = rt.intersection([
  rt.type({
    name: rt.string,
    metrics: rt.array(InfraEntityMetricsRT),
    metadata: rt.array(InfraEntityMetadataRT),
    hasSystemMetrics: rt.boolean,
  }),
  rt.partial({
    alertsCount: rt.number,
  }),
]);

export const GetInfraMetricsResponsePayloadRT = rt.intersection([
  EntityTypeRT,
  rt.type({
    nodes: rt.array(InfraEntityMetricsItemRT),
  }),
]);

export type InfraEntityMetrics = rt.TypeOf<typeof InfraEntityMetricsRT>;
export type InfraEntityMetadata = rt.TypeOf<typeof InfraEntityMetadataRT>;
export type InfraEntityMetadataType = rt.TypeOf<typeof InfraEntityMetadataTypeRT>;
export type InfraEntityMetricType = rt.TypeOf<typeof InfraMetricTypeRT>;
export type InfraEntityMetricsItem = rt.TypeOf<typeof InfraEntityMetricsItemRT>;

export type GetInfraMetricsRequestBodyPayload = rt.TypeOf<
  typeof GetInfraMetricsRequestBodyPayloadRT
>;

export type GetInfraMetricsRequestBodyPayloadClient = rt.OutputOf<
  typeof GetInfraMetricsRequestBodyPayloadRT
>;

export type GetInfraMetricsResponsePayload = rt.TypeOf<typeof GetInfraMetricsResponsePayloadRT>;
