/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flyoutV2DocViewerStateSchema } from './flyout_v2_doc_viewer_state_schema';
import type { FlyoutV2UrlParamValue } from './flyout_v2_url_param';

const analyzerDescriptor = {
  kind: 'analyzer',
  documentId: 'alert-1',
  indexName: '.alerts-security.alerts-default',
} as const;
const hostDescriptor = { kind: 'host', hostName: 'web-01' } as const;

describe('flyoutV2DocViewerStateSchema', () => {
  it('accepts a root and child descriptor', () => {
    const state = { flyoutV2: [analyzerDescriptor, hostDescriptor] };

    expect(flyoutV2DocViewerStateSchema.safeParse(state)).toEqual({
      success: true,
      data: state,
    });
  });

  it('accepts string array fields', () => {
    const state: { flyoutV2: FlyoutV2UrlParamValue } = {
      flyoutV2: [{ kind: 'cspVulnerability', vulnerabilityId: ['CVE-1', 'CVE-2'] }],
    };

    expect(flyoutV2DocViewerStateSchema.safeParse(state).success).toBe(true);
  });

  it.each([
    ['an unknown kind', { flyoutV2: [{ kind: 'unknown', id: 'x' }] }],
    ['more than two descriptors', { flyoutV2: [hostDescriptor, hostDescriptor, hostDescriptor] }],
    ['an empty chain', { flyoutV2: [] }],
    ['an unbounded string', { flyoutV2: [{ kind: 'host', hostName: 'a'.repeat(1025) }] }],
    ['a non-string field', { flyoutV2: [{ kind: 'host', hostName: 42 }] }],
  ])('rejects %s', (_, state) => {
    expect(flyoutV2DocViewerStateSchema.safeParse(state).success).toBe(false);
  });
});
