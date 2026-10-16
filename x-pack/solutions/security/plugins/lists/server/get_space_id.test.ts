/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';

import { getSpaceId } from './get_space_id';

describe('get_space_id', () => {
  test('returns the space id from the request', () => {
    const request = httpServerMock.createKibanaRequest({ spaceId: asSpaceId('default') });
    expect(getSpaceId({ request })).toEqual('default');
  });

  test('returns a non-default space id from the request', () => {
    const request = httpServerMock.createKibanaRequest({
      spaceId: asSpaceId('another-space'),
    });
    expect(getSpaceId({ request })).toEqual('another-space');
  });
});
