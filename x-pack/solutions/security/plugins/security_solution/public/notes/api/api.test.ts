/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaServices } from '../../common/lib/kibana';
import * as api from './api';

jest.mock('../../common/lib/kibana', () => {
  return {
    KibanaServices: {
      get: jest.fn(),
    },
  };
});

describe('Notes API client', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });
  describe('create note', () => {
    it('should throw an error when a response code other than 200 is returned', async () => {
      (KibanaServices.get as jest.Mock).mockReturnValue({
        http: {
          patch: jest.fn().mockRejectedValue({
            body: {
              status_code: 500,
              message: 'Internal server error',
            },
          }),
        },
      });

      expect(async () =>
        api.createNote({
          note: {
            timelineId: '1',
          },
        })
      ).rejects.toThrow();
    });
  });
});
