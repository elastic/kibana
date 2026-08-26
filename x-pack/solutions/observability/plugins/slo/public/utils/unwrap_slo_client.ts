/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLORepositoryClient } from '../types';

/**
 * SLO server routes wrap their response in `{ _wrapped, _inspect }` (arrays) or
 * `{ ..., _inspect }` (objects) whenever ES query inspection is enabled (dev mode
 * or the `observability:enableInspectEsQueries` advanced setting). Consumers that
 * don't render the inspect flyout expect the unwrapped payload, so this wraps a
 * `sloClient` to transparently strip the inspection envelope.
 */
export const createUnwrappingSloClient = (sloClient: SLORepositoryClient): SLORepositoryClient => ({
  fetch: (endpoint, ...args) =>
    sloClient.fetch(endpoint, ...args).then((response) => {
      if (response && typeof response === 'object') {
        const resp = response as Record<string, unknown>;
        if ('_wrapped' in resp && '_inspect' in resp) {
          return resp._wrapped as typeof response;
        }
        if ('_inspect' in resp) {
          const { _inspect, ...rest } = resp;
          return rest as typeof response;
        }
      }
      return response;
    }),
  stream: sloClient.stream,
});
