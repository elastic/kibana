/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { COUNT_ROUTE, CURRENT_API_VERSION } from '@kbn/kubernetes-security-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const MOCK_INDEX = 'kubernetes-test-index';
const ORCHESTRATOR_NAMESPACE_PROPERTY = 'orchestrator.namespace';
const CONTAINER_IMAGE_NAME_PROPERTY = 'container.image.name';
const TIMESTAMP_PROPERTY = '@timestamp';

// eslint-disable-next-line import/no-default-export
export default function countTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  function getRoute() {
    return supertest
      .get(COUNT_ROUTE)
      .set('kbn-xsrf', 'foo')
      .set('Elastic-Api-Version', CURRENT_API_VERSION);
  }

  describe('Kubernetes security with a basic license', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/functional/es_archives/kubernetes_security/process_events'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/kubernetes_security/process_events'
      );
    });

    it(`${COUNT_ROUTE} returns cardinality of a field`, async () => {
      const response = await getRoute().query({
        query: JSON.stringify({ match: { [CONTAINER_IMAGE_NAME_PROPERTY]: 'debian11' } }),
        field: ORCHESTRATOR_NAMESPACE_PROPERTY,
        index: MOCK_INDEX,
      });
      expect(response.status).to.be(200);
      expect(response.body).to.be(11);
    });

    it(`${COUNT_ROUTE} allows a range query`, async () => {
      const response = await getRoute().query({
        query: JSON.stringify({
          range: {
            [TIMESTAMP_PROPERTY]: {
              gte: '2020-12-16T15:16:28.570Z',
              lte: '2020-12-16T15:16:30.570Z',
            },
          },
        }),
        field: ORCHESTRATOR_NAMESPACE_PROPERTY,
        index: MOCK_INDEX,
      });
      expect(response.status).to.be(200);
      expect(response.body).to.be(3);
    });

    it(`${COUNT_ROUTE} handles a bad query`, async () => {
      const response = await getRoute().query({
        query: JSON.stringify({
          range: 'asdf',
        }),
        field: ORCHESTRATOR_NAMESPACE_PROPERTY,
        index: MOCK_INDEX,
      });
      expect(response.status).to.be(400);
    });
  });
}
