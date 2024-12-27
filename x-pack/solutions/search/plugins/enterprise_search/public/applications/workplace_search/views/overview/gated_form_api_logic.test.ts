/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { sendGatedFormData } from './gated_form_api_logic';

describe('GatedFormApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('sendGatedFormData', () => {
    it('calls correct api', async () => {
      const wsFormData = {
        additionalFeedback: 'my-test-additional-data',
        feature: 'Analytics',
        featuresOther: null,
        participateInUXLabs: null,
      };
      const promise = Promise.resolve();
      http.put.mockReturnValue(promise);
      sendGatedFormData(wsFormData);
      await nextTick();
      expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/ws_gate', {
        body: '{"ws_gate_data":{"additional_feedback":"my-test-additional-data","feature":"Analytics"}}',
      });
    });
  });
});
