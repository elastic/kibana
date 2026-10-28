/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const OTEL_LOGS_INDEX = 'logs-*.otel-*';
export const OTEL_TRACES_INDEX = 'traces-*.otel-*';

/** `telemetry.sdk.language` of the browser SDKs; the OTel indices also hold backend services. */
export const BROWSER_SDK_LANGUAGE = 'webjs';
