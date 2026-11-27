/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Git-grep ERE matching metric constructor and builder spellings supported by pure OTel extraction. */
export const otelMetricConstructorGrepPattern: string =
  '(create(Counter|UpDownCounter|Histogram|Gauge|ObservableUpDownCounter|ObservableGauge|ObservableCounter)|Create(Counter|UpDownCounter|Histogram|Gauge|ObservableUpDownCounter|ObservableGauge|ObservableCounter)|create_(counter|up_down_counter|histogram|gauge|observable_counter|observable_gauge|observable_up_down_counter)|Int64(Counter|UpDownCounter|ObservableUpDownCounter|ObservableCounter|ObservableGauge|Histogram|Gauge)|Float64(Counter|UpDownCounter|ObservableUpDownCounter|ObservableCounter|ObservableGauge|Histogram|Gauge)|(counter|histogram|gauge|upDownCounter)Builder)';

/** Git-grep ERE patterns grouped by the OTel idiom they prove. */
export const otelInstrumentationPatterns = {
  instrumentation_grpc: [
    'grpc[.]otel',
    'otelgrpc',
    'opentelemetry.*grpc',
    '[oO]pen[Tt]elemetry[.]Instrumentation[.]Grpc',
  ],
  instrumentation_http: [
    'http[.]otel',
    'otelhttp',
    'opentelemetry.*http',
    'instrumentation[-./](http|fetch|requests|urllib3|aspnetcore|sinatra)',
    '[oO]pen[Tt]elemetry[.]Instrumentation[.](Http|AspNetCore)',
  ],
  instrumentation_other: [
    '@opentelemetry/',
    'go[.]opentelemetry[.]io',
    '[oO]pen[Tt]elemetry',
    'OTEL_[A-Z0-9_]+',
  ],
  start_span: [
    'startSpan',
    'startActiveSpan',
    'start_as_current_span',
    'start_span',
    'spanBuilder',
    'in_span',
    'StartActivity',
    '[.]Start[(]',
  ],
  set_attribute: ['setAttribute', 'setAttributes', 'set_attribute', 'SetTag', 'SpanAttribute'],
  add_event: ['addEvent', 'add_event', 'AddEvent', 'ActivityEvent'],
  record_exception: [
    'recordException',
    'record_exception',
    'RecordException',
    'RecordError',
    'record_error',
  ],
  set_status_error: ['setStatus', 'set_status', 'SetStatus'],
  create_metric: [otelMetricConstructorGrepPattern],
} as const;

/** Names every instrumentation idiom represented by the standard gate. */
export type OtelInstrumentationKind = keyof typeof otelInstrumentationPatterns;
