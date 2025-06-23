/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createWithActiveSpan } from '@kbn/tracing';
import { ATTR_SPAN_TYPE } from '@kbn/opentelemetry-attributes';
import { APP_ID } from '../../common/constants';

/**
 * This is a thin wrapper around withActiveSpan from @kbn/tracing, which
 * sets span type to Security APP_ID by default. This span type is used to
 * distinguish Security spans from everything else when inspecting traces.
 *
 * Use this method to capture information about the execution of a specific
 * code path and highlight it in APM UI.
 *
 * Overloads:
 *   1. (name, cb)
 *   2. (name, options, cb)
 *   3. (name, options, context, cb)
 *
 * @param name     Span name
 * @param options  (optional) Span options object
 * @param context  (optional) OTel context in which to start the span
 * @param cb       Code block you want to measure
 *
 * @returns Whatever the measured code block returns
 */

export const withSecuritySpan = createWithActiveSpan({
  attributes: {
    [ATTR_SPAN_TYPE]: APP_ID,
  },
});
