/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { Agent } from 'supertest';
import type { GraphRequest } from '@kbn/cloud-security-posture-common/types/graph/v1';
import type { FtrProviderContext } from '../ftr_provider_context';
import { result } from '../utils';

// eslint-disable-next-line import/no-default-export
export default function graphBasicTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const logger = getService('log');

  const postGraph = (agent: Agent, body: GraphRequest) => {
    return agent
      .post('/internal/cloud_security_posture/graph')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'xxxx')
      .send(body);
  };

  describe('POST /internal/cloud_security_posture/graph - Basic license', () => {
    it('should return 403 when license is below platinum', async () => {
      await postGraph(supertest, {
        query: {
          originEventIds: [],
          start: 'now-1d/d',
          end: 'now/d',
        },
      }).expect(result(403, logger));
    });
  });
}
