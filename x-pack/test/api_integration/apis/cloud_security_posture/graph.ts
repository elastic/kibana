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
import type { GraphRequest } from '@kbn/cloud-security-posture-common/types/graph/latest';
import { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import { result } from '../../../cloud_security_posture_api/utils';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const logger = getService('log');
  const supertest = getService('supertest');

  const postGraph = (agent: Agent, body: GraphRequest, auth?: { user: string; pass: string }) => {
    let req = agent
      .post('/internal/cloud_security_posture/graph')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'xxxx');

    if (auth) {
      req = req.auth(auth.user, auth.pass);
    }

    return req.send(body);
  };

  describe('POST /internal/cloud_security_posture/graph', () => {
    // TODO: fix once feature flag is enabled for the API
    describe.skip('Feature flag', () => {
      it('should return 404 when feature flag is not toggled', async () => {
        await postGraph(supertest, {
          query: {
            originEventIds: [],
            start: 'now-1d/d',
            end: 'now/d',
          },
        }).expect(result(404, logger));
      });
    });
  });
}
