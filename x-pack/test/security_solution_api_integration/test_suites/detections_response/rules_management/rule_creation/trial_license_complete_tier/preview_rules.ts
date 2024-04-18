/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_PREVIEW } from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { getSimplePreviewRule, getSimpleRulePreviewOutput } from '../../../utils';
import { deleteAllRules } from '../../../../../../common/utils/security_solution';

import {
  createUserAndRole,
  deleteUserAndRole,
} from '../../../../../../common/services/security_solution';

import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@serverless @ess preview_rules', () => {
    describe('previewing rules', () => {
      before(async () => {
        await esArchiver.load(path);
      });

      after(async () => {
        await esArchiver.unload(path);
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      describe('elastic admin preview', () => {
        it('should create a single preview rule', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_PREVIEW)
            .set('kbn-xsrf', 'true')
            .send(getSimplePreviewRule())
            .expect(200);
          expect(body).to.eql(getSimpleRulePreviewOutput(body.previewId, body.logs));
        });

        it("shouldn't cause a 409 conflict if we attempt to create the same rule_id twice", async () => {
          await supertest
            .post(DETECTION_ENGINE_RULES_PREVIEW)
            .set('kbn-xsrf', 'true')
            .send(getSimplePreviewRule())
            .expect(200);

          await supertest
            .post(DETECTION_ENGINE_RULES_PREVIEW)
            .set('kbn-xsrf', 'true')
            .send(getSimplePreviewRule())
            .expect(200);
        });

        it('should throw an error if an invalid invocation count is used', async () => {
          const { body } = await supertest
            .post(DETECTION_ENGINE_RULES_PREVIEW)
            .set('kbn-xsrf', 'true')
            .send(getSimplePreviewRule('', 0))
            .expect(200);
          const { logs } = getSimpleRulePreviewOutput(undefined, [
            { errors: ['Invalid invocation count'], warnings: [], duration: 0 },
          ]);
          expect(body).to.eql({ logs });
        });

        it('should limit concurrent requests to 10', async () => {
          const responses = await Promise.all(
            Array.from({ length: 15 }).map(() =>
              supertest
                .post(DETECTION_ENGINE_RULES_PREVIEW)
                .set('kbn-xsrf', 'true')
                .send(getSimplePreviewRule())
            )
          );

          expect(responses.filter((r) => r.body.statusCode === 429).length).to.eql(5);
        });
      });

      describe('@brokenInServerless t1_analyst', () => {
        const role = ROLES.t1_analyst;

        beforeEach(async () => {
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should NOT be able to preview a rule', async () => {
          await supertestWithoutAuth
            .post(DETECTION_ENGINE_RULES_PREVIEW)
            .auth(role, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(getSimplePreviewRule())
            .expect(403);
        });
      });

      describe('@brokenInServerless hunter', () => {
        const role = ROLES.hunter;

        beforeEach(async () => {
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should return with an error about not having correct permissions', async () => {
          const { body } = await supertestWithoutAuth
            .post(DETECTION_ENGINE_RULES_PREVIEW)
            .auth(role, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(getSimplePreviewRule())
            .expect(200);

          const { logs } = getSimpleRulePreviewOutput(undefined, [
            {
              errors: [
                'Missing "read" privileges for the ".preview.alerts-security.alerts" or ".internal.preview.alerts-security.alerts" indices. Without these privileges you cannot use the Rule Preview feature.',
              ],
              warnings: [],
              duration: 0,
            },
          ]);
          expect(body).to.eql({ logs });
        });
      });
    });
  });
};
