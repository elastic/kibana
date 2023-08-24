/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  describe('spaces', function () {
    it('rejects request to create a space', async () => {
      const { body, status } = await supertest
        .post('/api/spaces/space')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          id: 'custom',
          name: 'Custom',
          disabledFeatures: [],
        });

      // in a non-serverless environment this would succeed with a 200
      expect(body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Unable to create Space, this exceeds the maximum number of spaces set by the xpack.spaces.maxSpaces setting',
      });
      expect(status).toBe(400);
    });

    it('rejects request to update a space with disabledFeatures', async () => {
      const { body, status } = await supertest
        .put('/api/spaces/space/default')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          id: 'custom',
          name: 'Custom',
          disabledFeatures: ['some-feature'],
        });

      // in a non-serverless environment this would succeed with a 200
      expect(body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Unable to update Space, the disabledFeatures array must be empty when xpack.spaces.allowFeatureVisibility setting is disabled',
      });
      expect(status).toBe(400);
    });
  });
}
