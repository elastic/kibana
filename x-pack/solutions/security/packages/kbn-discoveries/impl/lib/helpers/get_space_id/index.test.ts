/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { getSpaceId } from '.';

describe('getSpaceId', () => {
  it('returns request.spaceId from core', () => {
    const request = httpServerMock.createKibanaRequest({ spaceId: asSpaceId('default') });
    expect(getSpaceId({ request })).toBe('default');
  });

  it('returns a non-default space id from the request', () => {
    const request = httpServerMock.createKibanaRequest({
      spaceId: asSpaceId('custom-space'),
    });
    expect(getSpaceId({ request })).toBe('custom-space');
  });
});
