/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  CASE_CONFIGURE_URL,
  SECURITY_SOLUTION_OWNER,
} from '../../../../../../plugins/cases/common/constants';
import {
  getConfiguration,
  getConfigureSavedObjectsFromES,
  getConnectorMappingsFromES,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('migrations', () => {
    describe('7.10.0', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      it('7.10.0 migrates configure cases connector', async () => {
        const { body } = await supertest
          .get(`${CASE_CONFIGURE_URL}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.length).to.be(1);
        expect(body[0]).key('connector');
        expect(body[0]).not.key('connector_id');
        expect(body[0].connector).to.eql({
          id: 'connector-1',
          name: 'Connector 1',
          type: '.none',
          fields: null,
        });
      });
    });

    describe('7.13.2', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      describe('owner field', () => {
        it('adds the owner field', async () => {
          const configuration = await getConfiguration({
            supertest,
            query: { owner: SECURITY_SOLUTION_OWNER },
          });

          expect(configuration[0].owner).to.be(SECURITY_SOLUTION_OWNER);
        });

        it('adds the owner field to the connector mapping', async () => {
          // We don't get the owner field back from the mappings when we retrieve the configuration so the only way to
          // check that the migration worked is by checking the saved object stored in Elasticsearch directly
          const mappings = await getConnectorMappingsFromES({ es });
          expect(mappings.body.hits.hits.length).to.be(1);
          expect(mappings.body.hits.hits[0]._source?.['cases-connector-mappings'].owner).to.eql(
            SECURITY_SOLUTION_OWNER
          );
        });
      });

      describe('migrating connector id to a reference', () => {
        it('preserves the connector id after migration in the API response', async () => {
          const configuration = await getConfiguration({
            supertest,
            query: { owner: SECURITY_SOLUTION_OWNER },
          });

          expect(configuration[0].connector.id).to.be('d68508f0-cf9d-11eb-a603-13e7747d215c');
        });

        it('preserves the connector fields after migration in the API response', async () => {
          const configuration = await getConfiguration({
            supertest,
            query: { owner: SECURITY_SOLUTION_OWNER },
          });

          expect(configuration[0].connector).to.eql({
            fields: null,
            id: 'd68508f0-cf9d-11eb-a603-13e7747d215c',
            name: 'Test Jira',
            type: '.jira',
          });
        });

        it('removes the connector id field in the saved object', async () => {
          const configurationFromES = await getConfigureSavedObjectsFromES({ es });
          expect(
            configurationFromES.body.hits.hits[0]._source?.['cases-configure'].connector
          ).to.not.have.property('id');
        });
      });
    });
  });
}
