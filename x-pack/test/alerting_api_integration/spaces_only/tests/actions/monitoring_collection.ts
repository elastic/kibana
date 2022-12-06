/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

const CLUSTER_ACTIONS_MONITORING_COLLECTION_URL = `/api/monitoring_collection/cluster_actions`;

// eslint-disable-next-line import/no-default-export
export default function actionsMonitoringCollectionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('monitoring_collection', () => {
    it('should calculate overdue task count and percentiles', async () => {
      // We're not forcing any overdue tasks for this test, just testing that the
      // route returns successfully and that the expected fields are there
      const getResponse = await supertest.get(CLUSTER_ACTIONS_MONITORING_COLLECTION_URL);
      expect(getResponse.status).to.eql(200);
      expect(typeof getResponse.body.cluster_actions.overdue.count).to.eql('number');
      expect(typeof getResponse.body.cluster_actions.overdue.delay.p50).to.eql('number');
      expect(typeof getResponse.body.cluster_actions.overdue.delay.p99).to.eql('number');
    });
  });
}
