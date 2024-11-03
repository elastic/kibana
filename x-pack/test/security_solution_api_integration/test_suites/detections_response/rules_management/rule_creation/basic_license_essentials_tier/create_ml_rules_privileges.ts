/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';

import { removeServerGeneratedProperties, getSimpleMlRule, updateUsername } from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const utils = getService('securitySolutionUtils');
  const auditbeatPath = dataPathBuilder.getPath('auditbeat/hosts');

  describe('create_ml_rules', () => {
    describe('Creating Machine Learning rules', function () {
      before(async () => {
        await esArchiver.load(auditbeatPath);
      });

      after(async () => {
        await esArchiver.unload(auditbeatPath);
      });

      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      describe('@ess', function () {
        /* Wrapped in `describe` block, because `this.tags` only works in `describe` blocks */
        this.tags('skipFIPS');
        it('should give a 403 when trying to create a single Machine Learning rule since the license is basic', async function () {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
            .send(getSimpleMlRule())
            .expect(403);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare).toEqual({
            message: 'Your license does not support machine learning. Please upgrade your license.',
            status_code: 403,
          });
        });
      });

      it('@serverless @serverlessQA should give a 200 when trying to create a single Machine Learning rule since the license is essentials', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .send(getSimpleMlRule())
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const expectedRule = updateUsername(getSimpleMlRule(), await utils.getUsername());
        expect(bodyToCompare).toEqual(expect.objectContaining(expectedRule));
      });
    });
  });
};
