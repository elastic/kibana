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

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteSignalsIndex } from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('create_index', () => {
    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
    });

    describe('elastic admin', () => {
      describe('with another index that shares index alias', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/signals/index_alias_clash');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/signals/index_alias_clash');
        });

        // This fails and should be investigated or removed if it no longer applies
        it.skip('should report that signals index does not exist', async () => {
          const { body } = await supertest.get(DETECTION_ENGINE_INDEX_URL).send().expect(404);
          expect(body).to.eql({ message: 'index for this space does not exist', status_code: 404 });
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

      describe('with an outdated signals index', () => {
        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/endpoint/resolver/signals');
        });

        afterEach(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/endpoint/resolver/signals');
        });

        it('should report that signals index is outdated', async () => {
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
