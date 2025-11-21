/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import {
  API_VERSIONS,
  DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
} from '@kbn/security-solution-plugin/common/constants';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { getSimpleQuery } from '../../utils/queries';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('@ess @serverless @serverlessQA Search Alerts - Common', () => {
    it('should fetch all detection and attack alerts', async () => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(getSimpleQuery())
        .expect(200);
      expect(body.hits.total.value).toEqual(6);
    });
  });
};
