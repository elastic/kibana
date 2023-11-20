/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_ALERT_ASSIGNEES_URL } from '@kbn/security-solution-plugin/common/constants';

import { createAlertsIndex, deleteAllAlerts, deleteAllRules, setAlertAssignees } from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess @serverless Alert User Assignment', () => {
    describe('validation checks', () => {
      it('should give errors when no alert ids are provided', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
          .set('kbn-xsrf', 'true')
          .send(setAlertAssignees({ assigneesToAdd: [], assigneesToRemove: [], ids: [] }))
          .expect(400);

        expect(body).to.eql({
          error: 'Bad Request',
          message: '[request body]: Invalid value "[]" supplied to "ids"',
          statusCode: 400,
        });
      });

      it('should give errors when empty alert ids are provided', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
          .set('kbn-xsrf', 'true')
          .send(setAlertAssignees({ assigneesToAdd: [], assigneesToRemove: [], ids: ['123', ''] }))
          .expect(400);

        expect(body).to.eql({
          error: 'Bad Request',
          message: '[request body]: Invalid value "" supplied to "ids"',
          statusCode: 400,
        });
      });

      it('should give errors when duplicate assignees exist in both add and remove', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL)
          .set('kbn-xsrf', 'true')
          .send(
            setAlertAssignees({
              assigneesToAdd: ['test-1'],
              assigneesToRemove: ['test-1'],
              ids: ['123'],
            })
          )
          .expect(400);

        expect(body).to.eql({
          message: ['Duplicate assignees ["test-1"] were found in the add and remove parameters.'],
          status_code: 400,
        });
      });
    });

    describe('tests with auditbeat data', () => {
      before(async () => {
        await esArchiver.load(path);
      });

      after(async () => {
        await esArchiver.unload(path);
      });

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
      });

      describe('updating assignees', () => {
        it('should add new assignees to single alert', async () => {
          // TODO: ...
        });

        it('should add new assignees to multiple alerts', async () => {
          // TODO: ...
        });

        it('should update assignees for single alert', async () => {
          // TODO: ...
        });

        it('should update assignees for multiple alerts', async () => {
          // TODO: ...
        });

        it('should remove assignees from single alert', async () => {
          // TODO: ...
        });

        it('should remove assignees from multiple alerts', async () => {
          // TODO: ...
        });
      });

      describe('authorization / RBAC', () => {
        it('should not allow viewer user to assign alerts', async () => {
          // TODO: ...
        });

        it('SERVERLESS ONLY!!! serverless roles', async () => {
          // TODO: ...
          // 't1_analyst', 't2_analyst', 't3_analyst', 'rule_author', 'soc_manager', 'detections_admin', 'platform_engineer'
        });

        it('should not expose assignment functionality in Basic license', async () => {
          // TODO: ...
        });
      });
    });
  });
};
