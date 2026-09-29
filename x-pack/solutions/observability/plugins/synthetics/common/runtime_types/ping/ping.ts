/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import type { SummaryCodec } from '../zod/ping';
import {
  PingErrorType,
  MonitorDetailsType,
  HttpResponseBodyType,
  X509ExpiryType,
  X509Type,
  TlsType,
  MonitorType,
  PingHeadersType,
  AgentType,
  UrlType,
  PingType,
  PingStateType,
  PingsResponseType,
  GetPingsParamsType,
  MonitorStatusHeatmapBucketType,
} from '../zod/ping';

export {
  PingErrorType,
  MonitorDetailsType,
  HttpResponseBodyType,
  X509ExpiryType,
  X509Type,
  TlsType,
  MonitorType,
  PingHeadersType,
  AgentType,
  UrlType,
  PingType,
  PingStateType,
  PingsResponseType,
  GetPingsParamsType,
  MonitorStatusHeatmapBucketType,
};

export type PingError = SchemaOutput<typeof PingErrorType>;
export type MonitorDetails = SchemaOutput<typeof MonitorDetailsType>;
export type HttpResponseBody = SchemaOutput<typeof HttpResponseBodyType>;
export type X509Expiry = SchemaOutput<typeof X509ExpiryType>;
export type X509 = SchemaOutput<typeof X509Type>;
export type Tls = SchemaOutput<typeof TlsType>;
export type Monitor = SchemaOutput<typeof MonitorType>;
export type PingHeaders = SchemaOutput<typeof PingHeadersType>;
export type TestSummary = SchemaOutput<typeof SummaryCodec>;
export type Ping = SchemaOutput<typeof PingType>;
export type PingState = SchemaOutput<typeof PingStateType>;
export type PingsResponse = SchemaOutput<typeof PingsResponseType>;
export type GetPingsParams = SchemaOutput<typeof GetPingsParamsType>;
export type MonitorStatusHeatmapBucket = SchemaOutput<typeof MonitorStatusHeatmapBucketType>;
