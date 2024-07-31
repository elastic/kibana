/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_INDEX_URL,
} from '@kbn/security-solution-plugin/common/constants';

import { SIGNALS_FIELD_ALIASES_VERSION } from '@kbn/security-solution-plugin/server/lib/detection_engine/routes/index/get_signals_template';

import { deleteAllAlerts } from '../../../../../../../common/utils/security_solution';

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('@ess legacy create index route deals with 7.x to 8.x alerts index logic', () => {
    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
    });

    describe('elastic admin', () => {
      describe('with another index that shares index alias', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/signals/index_alias_clash');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/signals/index_alias_clash');
        });

        it('should return 200 for create_index', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_INDEX_URL)
            .set('kbn-xsrf', 'true')
            .send()
            .expect(200);
          expect(body).to.eql({ acknowledged: true });
        });
      });

      describe('with an outdated alerts index', () => {
        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/endpoint/resolver/signals');
        });

        afterEach(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/endpoint/resolver/signals');
        });

        it('should report that alerts index is outdated', async () => {
          const { body } = await supertest.get(DETECTION_ENGINE_INDEX_URL).send().expect(200);
          expect(body).to.eql({
            index_mapping_outdated: true,
            name: `${DEFAULT_ALERTS_INDEX}-default`,
          });
        });

        it('should return 200 for create_index and add field aliases', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_INDEX_URL)
            .set('kbn-xsrf', 'true')
            .send()
            .expect(200);
          expect(body).to.eql({ acknowledged: true });

          const mappings = await es.indices.get({
            index: '.siem-signals-default-000001',
          });
          // Make sure that aliases_version has been updated on the existing index
          expect(mappings['.siem-signals-default-000001'].mappings?._meta?.aliases_version).to.eql(
            SIGNALS_FIELD_ALIASES_VERSION
          );
        });
      });
    });
  });
};
