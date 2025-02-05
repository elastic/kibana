/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { result } from '@kbn/test-suites-xpack/cloud_security_posture_api/utils';
import type { Agent } from 'supertest';
import type { GraphRequest } from '@kbn/cloud-security-posture-common/types/graph/v1';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
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

  describe('POST /internal/cloud_security_posture/graph', function () {
    // see details: https://github.com/elastic/kibana/issues/208903
    this.tags(['failsOnMKI']);
    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
      );
      supertestViewer = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
        useCookieHeader: true, // to avoid generating API key and use Cookie header instead
        withInternalHeaders: true,
      });
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/cloud_security_posture_api/es_archives/logs_gcp_audit');
    });

    describe('Authorization', () => {
      it('should return an empty graph', async () => {
        const response = await postGraph(supertestViewer, {
          query: {
            originEventIds: [],
            start: 'now-1d/d',
            end: 'now/d',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(0);
        expect(response.body).to.have.property('edges').length(0);
        expect(response.body).not.to.have.property('messages');
      });

      it('should return a graph with nodes and edges by actor', async () => {
        const response = await postGraph(supertestViewer, {
          query: {
            originEventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [{ match_phrase: { 'actor.entity.id': 'admin@example.com' } }],
              },
            },
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: any) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
        });
      });
    });
  });
}
