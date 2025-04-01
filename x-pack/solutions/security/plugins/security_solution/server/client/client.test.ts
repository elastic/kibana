/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNALS_INDEX_KEY } from '../../common/constants';
import { createMockConfig } from '../lib/detection_engine/routes/__mocks__';
import { AppClient } from './client';

describe('SiemClient', () => {
  describe('#getSignalsIndex', () => {
    it('returns the index scoped to the specified spaceId', () => {
      const mockConfig = {
        ...createMockConfig(),
        [SIGNALS_INDEX_KEY]: 'mockSignalsIndex',
      };
      const spaceId = 'fooSpace';
      const client = new AppClient(spaceId, mockConfig, '8.7', 'main', 'traditional');

      expect(client.getSignalsIndex()).toEqual('mockSignalsIndex-fooSpace');
    });
  });
});
