/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutV2UrlParamValue } from './flyout_v2_url_param';

/**
 * Alternative storage for the open flyout chain, used instead of the `flyoutV2` URL param when a
 * host owns the deep-link state itself (e.g. Discover's doc viewer, which persists it as part of
 * the expanded document's shareable state).
 */
export interface FlyoutV2StateSink {
  read: () => FlyoutV2UrlParamValue;
  write: (stack: FlyoutV2UrlParamValue | null) => void;
}

/**
 * Keyed by `historyKey` so only flyouts opened in that history group are redirected. Module-scoped
 * (like the writer's generation tracking) because flyouts open in separate React roots via
 * `openSystemFlyout`, where a React context provided by the host would not be visible.
 */
const sinks = new Map<symbol, FlyoutV2StateSink>();

/** Registers a sink for a history group and returns the matching unregister function. */
export const registerFlyoutV2StateSink = (
  historyKey: symbol,
  sink: FlyoutV2StateSink
): (() => void) => {
  sinks.set(historyKey, sink);

  return () => {
    // Only remove our own registration: a newer host may have replaced it in the meantime.
    if (sinks.get(historyKey) === sink) {
      sinks.delete(historyKey);
    }
  };
};

export const getFlyoutV2StateSink = (historyKey: symbol): FlyoutV2StateSink | undefined =>
  sinks.get(historyKey);
