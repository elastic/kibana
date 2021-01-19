/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../plugins/case/common/constants';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../plugins/security_solution/common/constants';
import { CommentType } from '../../../../../plugins/case/common/api';
import {
  defaultUser,
  postCaseReq,
  postCaseResp,
  removeServerGeneratedPropertiesFromCase,
} from '../../../common/lib/mock';
import { deleteCases, deleteCasesUserActions } from '../../../common/lib/utils';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  deleteAllAlerts,
  getRuleForSignalTesting,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  getSignalsByIds,
  createRule,
  getQuerySignalIds,
} from '../../../../detection_engine_api_integration/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('patch_cases', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteCasesUserActions(es);
    });

    it('should patch a case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCases } = await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: 'closed',
            },
          ],
        })
        .expect(200);

      const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
      expect(data).to.eql({
        ...postCaseResp(postedCase.id),
        closed_by: defaultUser,
        status: 'closed',
        updated_by: defaultUser,
      });
    });

    it('should patch a case with new connector', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCases } = await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              connector: {
                id: 'jira',
                name: 'Jira',
                type: '.jira',
                fields: { issueType: 'Task', priority: null, parent: null },
              },
            },
          ],
        })
        .expect(200);

      const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
      expect(data).to.eql({
        ...postCaseResp(postedCase.id),
        connector: {
          id: 'jira',
          name: 'Jira',
          type: '.jira',
          fields: { issueType: 'Task', priority: null, parent: null },
        },
        updated_by: defaultUser,
      });
    });

    it('unhappy path - 404s when case is not there', async () => {
      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: 'not-real',
              version: 'version',
              status: 'closed',
            },
          ],
        })
        .expect(404);
    });

    it('unhappy path - 406s when excess data sent', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              badKey: 'closed',
            },
          ],
        })
        .expect(406);
    });

    it('unhappy path - 400s when bad data sent', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: true,
            },
          ],
        })
        .expect(400);
    });

    it('unhappy path - 400s when unsupported status sent', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: 'not-supported',
            },
          ],
        })
        .expect(400);
    });

    it('unhappy path - 400s when bad connector type sent', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              connector: { id: 'none', name: 'none', type: '.not-exists', fields: null },
            },
          ],
        })
        .expect(400);
    });

    it('unhappy path - 400s when bad connector sent', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              connector: {
                id: 'none',
                name: 'none',
                type: '.jira',
                fields: { unsupported: 'value' },
              },
            },
          ],
        })
        .expect(400);
    });

    it('unhappy path - 409s when conflict', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(`${CASES_URL}`)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: 'version',
              status: 'closed',
            },
          ],
        })
        .expect(409);
    });

    describe('alerts', () => {
      beforeEach(async () => {
        await esArchiver.load('auditbeat/hosts');
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('auditbeat/hosts');
      });

      // FLAKY: https://github.com/elastic/kibana/issues/87988
      it.skip('updates alert status when the status is updated and syncAlerts=true', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);

        const { body: postedCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(200);

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signals = await getSignalsByIds(supertest, [id]);

        const alert = signals.hits.hits[0];
        expect(alert._source.signal.status).eql('open');

        const { body: caseUpdated } = await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({
            alertId: alert._id,
            index: alert._index,
            type: CommentType.alert,
          })
          .expect(200);

        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: caseUpdated.id,
                version: caseUpdated.version,
                status: 'in-progress',
              },
            ],
          })
          .expect(200);

        const { body: updatedAlert } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds([alert._id]))
          .expect(200);

        expect(updatedAlert.hits.hits[0]._source.signal.status).eql('in-progress');
      });

      it('does NOT updates alert status when the status is updated and syncAlerts=false', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);

        const { body: postedCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({ ...postCaseReq, settings: { syncAlerts: false } })
          .expect(200);

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signals = await getSignalsByIds(supertest, [id]);

        const alert = signals.hits.hits[0];
        expect(alert._source.signal.status).eql('open');

        const { body: caseUpdated } = await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({
            alertId: alert._id,
            index: alert._index,
            type: CommentType.alert,
          })
          .expect(200);

        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: caseUpdated.id,
                version: caseUpdated.version,
                status: 'in-progress',
              },
            ],
          })
          .expect(200);

        const { body: updatedAlert } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds([alert._id]))
          .expect(200);

        expect(updatedAlert.hits.hits[0]._source.signal.status).eql('open');
      });

      // Failing: See https://github.com/elastic/kibana/issues/88130
      it.skip('it updates alert status when syncAlerts is turned on', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);

        const { body: postedCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({ ...postCaseReq, settings: { syncAlerts: false } })
          .expect(200);

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signals = await getSignalsByIds(supertest, [id]);

        const alert = signals.hits.hits[0];
        expect(alert._source.signal.status).eql('open');

        const { body: caseUpdated } = await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({
            alertId: alert._id,
            index: alert._index,
            type: CommentType.alert,
          })
          .expect(200);

        // Update the status of the case with sync alerts off
        const { body: caseStatusUpdated } = await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: caseUpdated.id,
                version: caseUpdated.version,
                status: 'in-progress',
              },
            ],
          })
          .expect(200);

        // Turn sync alerts on
        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: caseStatusUpdated[0].id,
                version: caseStatusUpdated[0].version,
                settings: { syncAlerts: true },
              },
            ],
          })
          .expect(200);

        const { body: updatedAlert } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds([alert._id]))
          .expect(200);

        expect(updatedAlert.hits.hits[0]._source.signal.status).eql('in-progress');
      });

      it('it does NOT updates alert status when syncAlerts is turned off', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);

        const { body: postedCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(200);

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signals = await getSignalsByIds(supertest, [id]);

        const alert = signals.hits.hits[0];
        expect(alert._source.signal.status).eql('open');

        const { body: caseUpdated } = await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({
            alertId: alert._id,
            index: alert._index,
            type: CommentType.alert,
          })
          .expect(200);

        // Turn sync alerts off
        const { body: caseSettingsUpdated } = await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: caseUpdated.id,
                version: caseUpdated.version,
                settings: { syncAlerts: false },
              },
            ],
          })
          .expect(200);

        // Update the status of the case with sync alerts off
        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: caseSettingsUpdated[0].id,
                version: caseSettingsUpdated[0].version,
                status: 'in-progress',
              },
            ],
          })
          .expect(200);

        const { body: updatedAlert } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds([alert._id]))
          .expect(200);

        expect(updatedAlert.hits.hits[0]._source.signal.status).eql('open');
      });
    });
  });
};
