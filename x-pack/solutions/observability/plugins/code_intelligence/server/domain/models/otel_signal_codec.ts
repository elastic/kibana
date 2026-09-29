/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { sourceLocationRt } from '../source_location_codec';

/** Validates the OTel signal families extracted from production source. */
export const otelSignalKindRt = t.keyof({
  attr_key: null,
  error_status: null,
  event_name: null,
  metric_name: null,
  record_exception: null,
  span_name: null,
});
/** Identifies the OTel signal family. */
export type OtelSignalKind = t.TypeOf<typeof otelSignalKindRt>;

/** Validates metric instrument types that determine later query generation. */
export const otelMetricKindRt = t.keyof({
  counter: null,
  gauge: null,
  histogram: null,
  updown: null,
});
/** Identifies an OTel metric instrument type. */
export type OtelMetricKind = t.TypeOf<typeof otelMetricKindRt>;

/** Validates the static type hint inferred from an attribute value expression. */
export const otelValueHintRt = t.keyof({
  bool: null,
  enum: null,
  id: null,
  number: null,
  unknown: null,
});
/** Describes the useful static shape of an OTel attribute value. */
export type OtelValueHint = t.TypeOf<typeof otelValueHintRt>;

/** Validates source-derived OTel evidence without coupling it to a runtime adapter. */
export const otelSignalRt = t.intersection([
  t.type({
    evidence: t.readonlyArray(sourceLocationRt),
    kind: otelSignalKindRt,
    language: t.string,
  }),
  t.partial({
    metricKind: otelMetricKindRt,
    templated: t.boolean,
    value: t.string,
    valueHint: otelValueHintRt,
  }),
]);
/** Represents one OTel signal found in a bounded production-source window. */
export type OtelSignal = t.TypeOf<typeof otelSignalRt>;
