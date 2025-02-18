/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SpanOptions } from '@kbn/apm-utils';
import { withSpan } from '@kbn/apm-utils';
import agent from 'elastic-apm-node';
import { APP_ID } from '../../common/constants';

type Span = Exclude<typeof agent.currentSpan, undefined | null>;

/**
 * This is a thin wrapper around withSpan from @kbn/apm-utils, which sets
 * span type to Security APP_ID by default. This span type is used to
 * distinguish Security spans from everything else when inspecting traces.
 *
 * Use this method to capture information about the execution of a specific
 * code path and highlight it in APM IU.
 *
 * @param optionsOrName Span name or span options object
 * @param cb Code block you want to measure
 *
 * @returns Whatever the measured code block returns
 */
export const withSecuritySpan = <T>(
  optionsOrName: SpanOptions | string,
  cb: (span?: Span) => Promise<T>
) =>
  withSpan<T>(
    {
      type: APP_ID,
      ...(typeof optionsOrName === 'string' ? { name: optionsOrName } : optionsOrName),
    },
    cb
  );

export const withSecuritySpanSync = <T>(name: string, fn: (span: Span | null) => T): T => {
  const span = agent.startSpan(name, APP_ID);

  try {
    const result = fn(span);
    return result;
  } finally {
    if (span) {
      span.end();
    }
  }
};
