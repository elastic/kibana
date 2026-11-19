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
import { errors as esErrors } from '@elastic/elasticsearch';
import type { Agent } from 'supertest';
import type {
  EdgeDataModel,
  GraphRequest,
  GraphResponse,
  NodeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/v1';
import { result } from './utils';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const fleetFinalPipelineId = '.fleet_final_pipeline-1';
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
      // Create a no-op fleet final pipeline to prevent errors when loading
      // the logs_gcp_audit archive, whose index template references this pipeline.
      // The pipeline is shared by Fleet-managed indices in this serverless test env,
      // so avoid overwriting or deleting it when it already exists.
      try {
        await es.ingest.getPipeline({ id: fleetFinalPipelineId });
      } catch (error) {
        if (!(error instanceof esErrors.ResponseError) || error.statusCode !== 404) {
          throw error;
        }

        await es.ingest.putPipeline({
          id: fleetFinalPipelineId,
          description: 'No-op pipeline for testing',
          processors: [],
        });
      }

      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/security_alerts',
        { docsOnly: true }
      );
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
      );
      supertestViewer = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
        useCookieHeader: true, // to avoid generating API key and use Cookie header instead
        withInternalHeaders: true,
      });
    });

    after(async () => {
      // Using unload destroys index's alias of .alerts-security.alerts-default which causes a failure in other tests
      // Instead we delete all alerts from the index
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await esArchiver.unload(
        'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
      );
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
                filter: [
                  {
                    match_phrase: {
                      'user.id': 'admin@example.com',
                    },
                  },
                ],
                must_not: [
                  {
                    match_phrase: {
                      'event.action': 'google.iam.admin.v1.UpdateRole',
                    },
                  },
                ],
              },
            },
          },
        }).expect(result(200));

        const body = response.body as GraphResponse;

        expect(body).to.have.property('nodes').length(3);
        expect(body).to.have.property('edges').length(2);
        expect(body).not.to.have.property('messages');

        body.nodes.forEach((node: NodeDataModel) => {
          expect('color' in node).to.be(true);
          if (!('color' in node)) {
            throw new Error(`node color missing [node: ${node.id}]`);
          }

          expect(node.color).equal(
            'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
        });

        body.edges.forEach((edge: EdgeDataModel) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'subdued',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
          expect(edge.type).equal('solid');
        });
      });
    });
  });
}
