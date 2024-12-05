/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCapabilitiesRoute } from './get_capabilities_route';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getGetCapabilitiesRequest } from '../../__mocks__/request';
import { getPluginNameFromRequest } from '../helpers';

jest.mock('../helpers');

describe('Get Capabilities Route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());

    getCapabilitiesRoute(server.router);
  });

  describe('Status codes', () => {
    it('returns 200 with capabilities', async () => {
      const response = await server.inject(
        getGetCapabilitiesRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    it('returns 500 if an error is thrown in fetching capabilities', async () => {
      (getPluginNameFromRequest as jest.Mock).mockImplementation(() => {
        throw new Error('Mocked error');
      });
      const response = await server.inject(
        getGetCapabilitiesRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
    });
  });
});
