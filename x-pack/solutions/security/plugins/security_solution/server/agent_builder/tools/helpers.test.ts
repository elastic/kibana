/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { getSpaceIdFromRequest } from './helpers';

describe('getSpaceIdFromRequest', () => {
  const createMockRequest = (pathname: string): KibanaRequest => {
    return {
      url: {
        pathname,
      },
    } as KibanaRequest;
  };

  it('returns the space ID from the path when present', () => {
    const request = createMockRequest('/s/my-space/app/security');
    expect(getSpaceIdFromRequest(request)).toBe('my-space');
  });

  it('returns the space ID when path starts with /s/', () => {
    const request = createMockRequest('/s/custom-space');
    expect(getSpaceIdFromRequest(request)).toBe('custom-space');
  });

  it('returns the space ID with underscores and hyphens', () => {
    const request = createMockRequest('/s/my_space-123');
    expect(getSpaceIdFromRequest(request)).toBe('my_space-123');
  });

  it('returns default space ID when path does not contain space', () => {
    const request = createMockRequest('/app/security');
    expect(getSpaceIdFromRequest(request)).toBe(DEFAULT_SPACE_ID);
  });

  it('returns default space ID when pathname is empty', () => {
    const request = createMockRequest('');
    expect(getSpaceIdFromRequest(request)).toBe(DEFAULT_SPACE_ID);
  });

  it('returns default space ID when url is undefined', () => {
    const request = {} as KibanaRequest;
    expect(getSpaceIdFromRequest(request)).toBe(DEFAULT_SPACE_ID);
  });

  it('returns default space ID when path does not match space pattern', () => {
    const request = createMockRequest('/some/other/path');
    expect(getSpaceIdFromRequest(request)).toBe(DEFAULT_SPACE_ID);
  });

  it('returns default space ID when space segment is empty', () => {
    const request = createMockRequest('/s/');
    expect(getSpaceIdFromRequest(request)).toBe(DEFAULT_SPACE_ID);
  });
});


