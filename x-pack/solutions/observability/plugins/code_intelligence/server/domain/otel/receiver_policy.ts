/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Matches receiver names conventionally used for OpenTelemetry spans, tracers, meters, and scopes. */
export const otelReceiverNamePattern: string =
  '(?:span|otel_?span|active_?span|current_?span|activity|tracer|meter|scope)';

/** Returns whether a directly captured receiver identifies an OpenTelemetry object. */
export const isOtelReceiver = (receiver: string): boolean =>
  new RegExp(`\\b${otelReceiverNamePattern}\\b`, 'i').test(receiver);

/** Returns whether source text contains an OpenTelemetry-shaped receiver name. */
export const hasOtelReceiver = (content: string): boolean =>
  new RegExp(`\\b${otelReceiverNamePattern}\\b`, 'i').test(content);

/** Builds a case-insensitive expression requiring an OTel receiver to call one method family. */
export const otelReceiverCallPattern = (method: string): RegExp =>
  new RegExp(
    `\\b${otelReceiverNamePattern}\\b\\s*(?:\\?\\.|\\?->|\\.|->)\\s*${method}\\s*\\(`,
    'i'
  );
