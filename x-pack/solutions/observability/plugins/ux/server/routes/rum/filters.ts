/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import { RUM_SESSION_SOURCE_INDEX } from '../../../common/session_replay';
import type { RumFiltersResponse } from '../../../common/rum_app';
import {
  BROWSER_SCRIPT,
  BREAKPOINT_SCRIPT,
  CONNECTION_SCRIPT,
  DEVICE_SCRIPT,
  OS_SCRIPT,
  facetFromScriptTerms,
  pagePathTerms,
  rumBaseFilters,
  rumListQueryCodec,
} from './query';

export const getRumFiltersRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/filters',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ query: rumListQueryCodec }),
  handler: async ({ context, params }): Promise<RumFiltersResponse> => {
    const { elasticsearch } = await context.core;
    const client = elasticsearch.client.asCurrentUser;

    const result = await client.search({
      index: RUM_SESSION_SOURCE_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: { bool: { filter: rumBaseFilters(params.query) } },
      aggs: {
        browsers: {
          terms: { script: { source: BROWSER_SCRIPT, lang: 'painless' }, size: 20, exclude: '' },
        },
        os: {
          terms: { script: { source: OS_SCRIPT, lang: 'painless' }, size: 20, exclude: '' },
        },
        pages: pagePathTerms(30),
        breakpoints: {
          terms: { script: { source: BREAKPOINT_SCRIPT, lang: 'painless' }, size: 10, exclude: '' },
        },
        connections: {
          terms: { script: { source: CONNECTION_SCRIPT, lang: 'painless' }, size: 10, exclude: '' },
        },
        devices: {
          terms: { script: { source: DEVICE_SCRIPT, lang: 'painless' }, size: 10, exclude: '' },
        },
      },
    });

    const aggs = (result.aggregations ?? {}) as Record<string, unknown>;
    return {
      browsers: facetFromScriptTerms(aggs.browsers),
      os: facetFromScriptTerms(aggs.os),
      pages: facetFromScriptTerms(aggs.pages),
      breakpoints: facetFromScriptTerms(aggs.breakpoints),
      connections: facetFromScriptTerms(aggs.connections),
      devices: facetFromScriptTerms(aggs.devices),
    };
  },
});
