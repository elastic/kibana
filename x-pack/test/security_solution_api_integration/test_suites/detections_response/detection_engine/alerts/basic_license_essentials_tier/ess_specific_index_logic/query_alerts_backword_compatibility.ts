/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  createAlertsIndex,
  deleteAllAlerts,
} from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  describe('@ess query_alerts_backword_compatibility', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/endpoint/resolver/signals');
      await createAlertsIndex(supertest, log);
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/endpoint/resolver/signals');
      await deleteAllAlerts(supertest, log, es);
    });

    it('should be able to filter old alerts on host.os.name.caseless using runtime field', async () => {
      const query = {
        query: {
          bool: {
            should: [{ match_phrase: { 'host.os.name.caseless': 'windows' } }],
          },
        },
      };
      const { body } = await supertest
        .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
        .set('kbn-xsrf', 'true')
        .send(query)
        .expect(200);
      expect(body.hits.total.value).to.eql(3);
    });

    it('should be able to filter old alerts using field aliases', async () => {
      const query = {
        query: {
          bool: {
            should: [{ match_phrase: { 'kibana.alert.workflow_status': 'open' } }],
          },
        },
      };
      const { body } = await supertest
        .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
        .set('kbn-xsrf', 'true')
        .send(query)
        .expect(200);
      expect(body.hits.total.value).to.eql(3);
    });
  });
};
