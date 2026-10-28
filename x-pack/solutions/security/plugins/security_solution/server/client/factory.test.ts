/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { createMockConfig } from '../lib/detection_engine/routes/__mocks__';
import { AppClientFactory } from './factory';
import { AppClient } from './client';

jest.mock('./client');
const mockClient = AppClient as jest.Mock;

describe('AppClientFactory', () => {
  describe('#create', () => {
    const setupFactory = (factory: AppClientFactory) =>
      factory.setup({
        config: createMockConfig(),
        kibanaVersion: '8.7',
        kibanaBranch: 'main',
        buildFlavor: 'traditional',
      });

    const getCreatedSpaceIds = () => mockClient.mock.calls.map(([spaceId]) => spaceId);

    beforeEach(() => {
      mockClient.mockClear();
    });

    it("constructs a client in the request's space", () => {
      const factory = new AppClientFactory();
      setupFactory(factory);

      factory.create(httpServerMock.createKibanaRequest({ spaceId: 'my-space' }));

      expect(getCreatedSpaceIds()).toEqual(['my-space']);
    });

    it('constructs a client in the default space for requests without an explicit space', () => {
      const factory = new AppClientFactory();
      setupFactory(factory);

      factory.create(httpServerMock.createKibanaRequest());

      expect(getCreatedSpaceIds()).toEqual(['default']);
    });

    it('constructs each client in its own request space', () => {
      const factory = new AppClientFactory();
      setupFactory(factory);

      factory.create(httpServerMock.createKibanaRequest({ spaceId: 'space-a' }));
      factory.create(httpServerMock.createKibanaRequest({ spaceId: 'space-b' }));

      expect(getCreatedSpaceIds()).toEqual(['space-a', 'space-b']);
    });

    it('cannot call create without calling setup first', () => {
      const factory = new AppClientFactory();
      const mockRequest = httpServerMock.createKibanaRequest();
      expect(() => factory.create(mockRequest)).toThrow(
        'Cannot create AppClient as config is not present. Did you forget to call setup()?'
      );
    });
  });
});
