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
import { result } from './utils';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestViewer: Pick<Agent, 'post'>;

  const postGraph = (agent: Pick<Agent, 'post'>, body: GraphRequest) => {
    const req = agent
      .post('/internal/cloud_security_posture/graph')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'xxxx');

    return req.send(body);
  };

  describe('POST /internal/cloud_security_posture/graph - Essentials tier', function () {
    // see details: https://github.com/elastic/kibana/issues/208903
    this.tags(['failsOnMKI']);
    before(async () => {
      supertestViewer = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });
    });

    it('should return 404 because graph visualization is not available in essentials tier', async () => {
      await postGraph(supertestViewer, {
        query: {
          originEventIds: [],
          start: 'now-1d/d',
          end: 'now/d',
        },
      }).expect(result(404));
    });
  });
}
