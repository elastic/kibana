/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { getSpaceId } from '.';

describe('getSpaceId', () => {
  it('returns default when spaces service is null', () => {
    expect(
      getSpaceId({
        request: httpServerMock.createKibanaRequest(),
        spaces: null,
      })
    ).toBe('default');
  });

  it('returns default when spaces service is undefined', () => {
    expect(
      getSpaceId({
        request: httpServerMock.createKibanaRequest(),
        spaces: undefined,
      })
    ).toBe('default');
  });

  it('returns the space ID from the spaces service', () => {
    const request = httpServerMock.createKibanaRequest();
    const spaces = { getSpaceId: jest.fn().mockReturnValue('custom-space') } as never;

    expect(getSpaceId({ request, spaces })).toBe('custom-space');
  });
});
