/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  DEFAULT_SIGNALS_INDEX,
  DETECTION_ENGINE_INDEX_URL,
} from '../../../../plugins/security_solution/common/constants';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteSignalsIndex } from '../../utils';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('create_index', () => {
    afterEach(async () => {
      await deleteSignalsIndex(supertest);
    });

    describe('elastic admin', () => {
      it('should return a 404 when the signal index has never been created', async () => {
        const { body } = await supertest.get(DETECTION_ENGINE_INDEX_URL).send().expect(404);
        expect(body).to.eql({ message: 'index for this space does not exist', status_code: 404 });
      });

      it('should be able to create a signal index when it has not been created yet', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(body).to.eql({ acknowledged: true });
      });

      it('should be able to create a signal index two times in a row as the REST call is idempotent', async () => {
        await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send().expect(200);
        const { body } = await supertest
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(body).to.eql({ acknowledged: true });
      });

      it('should be able to read the index name and status as not being outdated', async () => {
        await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send().expect(200);

        const { body } = await supertest.get(DETECTION_ENGINE_INDEX_URL).send().expect(200);
        expect(body).to.eql({
          index_mapping_outdated: false,
          name: `${DEFAULT_SIGNALS_INDEX}-default`,
        });
      });
    });

    describe('t1_analyst', () => {
      const role = ROLES.t1_analyst;

      beforeEach(async () => {
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should return a 404 when the signal index has never been created', async () => {
        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(404);
        expect(body).to.eql({ message: 'index for this space does not exist', status_code: 404 });
      });

      it('should NOT be able to create a signal index when it has not been created yet. Should return a 403 and error that the user is unauthorized', async () => {
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .auth(role, 'changeme')
          .send()
          .expect(403);
        expect(body.message).to.match(/^security_exception/);
        expect(body.status_code).to.eql(403);
      });

      it('should be able to read the index name and status as not being outdated', async () => {
        // create the index using super user since this user cannot create the index
        await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send().expect(200);

        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(200);
        expect(body).to.eql({
          index_mapping_outdated: null,
          name: `${DEFAULT_SIGNALS_INDEX}-default`,
        });
      });
    });

    describe('t2_analyst', () => {
      const role = ROLES.t2_analyst;

      beforeEach(async () => {
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should return a 404 when the signal index has never been created', async () => {
        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(404);
        expect(body).to.eql({ message: 'index for this space does not exist', status_code: 404 });
      });

      it('should NOT be able to create a signal index when it has not been created yet. Should return a 403 and error that the user is unauthorized', async () => {
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .auth(role, 'changeme')
          .send()
          .expect(403);
        expect(body.message).to.match(/^security_exception/);
        expect(body.status_code).to.eql(403);
      });

      it('should be able to read the index name and status as not being outdated', async () => {
        // create the index using super user since this user cannot create an index
        await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send().expect(200);

        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(200);
        expect(body).to.eql({
          index_mapping_outdated: null,
          name: `${DEFAULT_SIGNALS_INDEX}-default`,
        });
      });
    });

    describe('detections_admin', () => {
      const role = ROLES.detections_admin;

      beforeEach(async () => {
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should return a 404 when the signal index has never been created', async () => {
        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(404);
        expect(body).to.eql({ message: 'index for this space does not exist', status_code: 404 });
      });

      it('should be able to create a signal index when it has not been created yet', async () => {
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .auth(role, 'changeme')
          .send()
          .expect(200);
        expect(body).to.eql({ acknowledged: true });
      });

      it('should be able to read the index name and status as not being outdated', async () => {
        await supertestWithoutAuth
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .auth(role, 'changeme')
          .send()
          .expect(200);

        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(200);
        expect(body).to.eql({
          index_mapping_outdated: false,
          name: `${DEFAULT_SIGNALS_INDEX}-default`,
        });
      });
    });

    describe('soc_manager', () => {
      const role = ROLES.soc_manager;

      beforeEach(async () => {
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should return a 404 when the signal index has never been created', async () => {
        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(404);
        expect(body).to.eql({ message: 'index for this space does not exist', status_code: 404 });
      });

      it('should NOT be able to create a signal index when it has not been created yet. Should return a 403 and error that the user is unauthorized', async () => {
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .auth(role, 'changeme')
          .send()
          .expect(403);
        expect(body.message).to.match(/^security_exception/);
        expect(body.status_code).to.eql(403);
      });

      it('should be able to read the index name and status as not being outdated', async () => {
        // create the index using super user since this user cannot create an index
        await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send().expect(200);

        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(200);
        expect(body).to.eql({
          index_mapping_outdated: false,
          name: `${DEFAULT_SIGNALS_INDEX}-default`,
        });
      });
    });

    describe('hunter', () => {
      const role = ROLES.hunter;

      beforeEach(async () => {
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should return a 404 when the signal index has never been created', async () => {
        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(404);
        expect(body).to.eql({ message: 'index for this space does not exist', status_code: 404 });
      });

      it('should NOT be able to create a signal index when it has not been created yet. Should return a 403 and error that the user is unauthorized', async () => {
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .auth(role, 'changeme')
          .send()
          .expect(403);
        expect(body.message).to.match(/^security_exception/);
        expect(body.status_code).to.eql(403);
      });

      it('should be able to read the index name and status as not being outdated', async () => {
        // create the index using super user since this user cannot create an index
        await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send().expect(200);

        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(200);
        expect(body).to.eql({
          index_mapping_outdated: null,
          name: `${DEFAULT_SIGNALS_INDEX}-default`,
        });
      });
    });

    describe('platform_engineer', () => {
      const role = ROLES.platform_engineer;

      beforeEach(async () => {
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should return a 404 when the signal index has never been created', async () => {
        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(404);
        expect(body).to.eql({ message: 'index for this space does not exist', status_code: 404 });
      });

      it('should be able to create a signal index when it has not been created yet', async () => {
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .auth(role, 'changeme')
          .send()
          .expect(200);
        expect(body).to.eql({ acknowledged: true });
      });

      it('should be able to read the index name and status as not being outdated', async () => {
        await supertestWithoutAuth
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .auth(role, 'changeme')
          .send()
          .expect(200);

        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(200);
        expect(body).to.eql({
          index_mapping_outdated: false,
          name: `${DEFAULT_SIGNALS_INDEX}-default`,
        });
      });
    });

    describe('reader', () => {
      const role = ROLES.reader;

      beforeEach(async () => {
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should return a 404 when the signal index has never been created', async () => {
        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(404);
        expect(body).to.eql({ message: 'index for this space does not exist', status_code: 404 });
      });

      it('should NOT be able to create a signal index when it has not been created yet. Should return a 401 unauthorized', async () => {
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .auth(role, 'changeme')
          .send()
          .expect(403);
        expect(body.message).to.match(/^security_exception/);
        expect(body.status_code).to.eql(403);
      });

      it('should be able to read the index name and status as being outdated.', async () => {
        // create the index using super user since this user cannot create the index
        await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send().expect(200);

        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(200);
        expect(body).to.eql({
          index_mapping_outdated: false,
          name: `${DEFAULT_SIGNALS_INDEX}-default`,
        });
      });
    });

    describe('rule_author', () => {
      const role = ROLES.rule_author;

      beforeEach(async () => {
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should return a 404 when the signal index has never been created', async () => {
        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(404);
        expect(body).to.eql({ message: 'index for this space does not exist', status_code: 404 });
      });

      it('should NOT be able to create a signal index when it has not been created yet. Should return a 401 unauthorized', async () => {
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_INDEX_URL)
          .set('kbn-xsrf', 'true')
          .auth(role, 'changeme')
          .send()
          .expect(403);
        expect(body.message).to.match(/^security_exception/);
        expect(body.status_code).to.eql(403);
      });

      it('should be able to read the index name and status as being outdated.', async () => {
        // create the index using super user since this user cannot create the index
        await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send().expect(200);

        const { body } = await supertestWithoutAuth
          .get(DETECTION_ENGINE_INDEX_URL)
          .auth(role, 'changeme')
          .send()
          .expect(200);
        expect(body).to.eql({
          index_mapping_outdated: false,
          name: `${DEFAULT_SIGNALS_INDEX}-default`,
        });
      });
    });
  });
};
