/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { getSpaceIdFromRequest } from './helpers';

describe('getSpaceIdFromRequest', () => {
  it('returns space ID from request path', () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/s/custom-space/app/security',
    });

    const spaceId = getSpaceIdFromRequest(request);

    expect(spaceId).toBe('custom-space');
  });

  it('returns default space ID when no space ID in path', () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/app/security',
    });

    const spaceId = getSpaceIdFromRequest(request);

    expect(spaceId).toBe(DEFAULT_SPACE_ID);
  });

  it('returns default space ID when path is root', () => {
    const request = httpServerMock.createKibanaRequest({
      path: '/',
    });

    const spaceId = getSpaceIdFromRequest(request);

    expect(spaceId).toBe(DEFAULT_SPACE_ID);
  });
});
