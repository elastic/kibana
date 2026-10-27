/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

type EventOriginChannel = 'system' | 'ui' | 'api';

export interface EventOrigin {
  actor: 'user';
  channel: EventOriginChannel;
  app?: string;
}

const EXECUTION_CONTEXT_HEADER = 'x-kbn-context';

const APP_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

const getChannel = (request: KibanaRequest): EventOriginChannel => {
  if (request.isFakeRequest) {
    return 'system';
  }

  const { headers } = request;
  const isUiRequest =
    request.isInternalApiRequest && Boolean(headers['kbn-version']) && Boolean(headers.referer);
  return isUiRequest ? 'ui' : 'api';
};

const getAppFromExecutionContext = (request: KibanaRequest): string | undefined => {
  const header = request.headers[EXECUTION_CONTEXT_HEADER];
  const rawContext = Array.isArray(header) ? header[0] : header;
  if (!rawContext) {
    return undefined;
  }

  try {
    const { name }: { name?: string } = JSON.parse(decodeURIComponent(rawContext));
    return typeof name === 'string' && APP_ID_PATTERN.test(name) ? name : undefined;
  } catch (err) {
    return undefined;
  }
};

/** Resolves the channel and app of a user request, mirroring alerting_v2 `lib/event_origin/event_origin.ts`. */
export const toEventOrigin = (request: KibanaRequest): EventOrigin => {
  const channel = getChannel(request);

  return {
    actor: 'user',
    channel,
    app: channel === 'ui' ? getAppFromExecutionContext(request) : undefined,
  };
};
