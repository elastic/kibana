/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { CASES_URL } from '../../../../../../plugins/cases/common/constants';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    // tests upgrading a 7.10.0 saved object to the latest version
    describe('7.10.0 -> latest stack version', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      it('migrates cases connector', async () => {
        const { body } = await supertest
          .get(`${CASES_URL}/e1900ac0-017f-11eb-93f8-d161651bf509`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).key('connector');
        expect(body).not.key('connector_id');
        expect(body.connector).to.eql({
          id: 'connector-1',
          name: 'none',
          type: '.none',
          fields: null,
        });
      });

      it('migrates cases settings', async () => {
        const { body } = await supertest
          .get(`${CASES_URL}/e1900ac0-017f-11eb-93f8-d161651bf509`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).key('settings');
        expect(body.settings).to.eql({
          syncAlerts: true,
        });
      });
    });

    // tests upgrading a 7.11.1 saved object to the latest version
    describe('7.11.1 -> latest stack version', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.11.1');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.11.1');
      });

      it('adds rule info to only alert comments for 7.12', async () => {
        const caseID = '2ea28c10-7855-11eb-9ca6-83ec5acb735f';
        // user comment
        let { body } = await supertest
          .get(`${CASES_URL}/${caseID}/comments/34a20a00-7855-11eb-9ca6-83ec5acb735f`)
          .expect(200);

        expect(body).not.key('rule');
        expect(body.rule).to.eql(undefined);

        // alert comment
        ({ body } = await supertest
          .get(`${CASES_URL}/${caseID}/comments/3178f2b0-7857-11eb-9ca6-83ec5acb735f`)
          .expect(200));

        expect(body).key('rule');
        expect(body.rule).to.eql({ id: null, name: null });
      });

      it('adds category and subcategory to the ITSM connector', async () => {
        const { body } = await supertest
          .get(`${CASES_URL}/6f973440-7abd-11eb-9ca6-83ec5acb735f`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).key('connector');
        expect(body.connector).to.eql({
          id: '444ebab0-7abd-11eb-9ca6-83ec5acb735f',
          name: 'SN',
          type: '.servicenow',
          fields: {
            impact: '2',
            severity: '2',
            urgency: '2',
            category: null,
            subcategory: null,
          },
        });
      });
    });
  });
}
