/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../alerting_api_integration/common/lib';

import { CASE_CONFIGURE_URL, CASES_URL } from '../../../../../plugins/case/common/constants';
import { postCaseReq, defaultUser, postCommentUserReq } from '../../../common/lib/mock';
import {
  deleteCases,
  deleteCasesUserActions,
  deleteComments,
  deleteConfiguration,
  getConfiguration,
  getServiceNowConnector,
} from '../../../common/lib/utils';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '../../../../alerting_api_integration/common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  describe('push_case', () => {
    const actionsRemover = new ActionsRemover(supertest);

    let servicenowSimulatorURL: string = '<could not determine kibana url>';
    before(() => {
      servicenowSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
    });

    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteConfiguration(es);
      await deleteCasesUserActions(es);
      await actionsRemover.removeAll();
    });

    it('should push a case', async () => {
      const { body: connector } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send({
          ...getServiceNowConnector(),
          config: { apiUrl: servicenowSimulatorURL },
        })
        .expect(200);

      actionsRemover.add('default', connector.id, 'action', 'actions');
      const { body: configure } = await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(
          getConfiguration({
            id: connector.id,
            name: connector.name,
            type: connector.actionTypeId,
          })
        )
        .expect(200);
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...postCaseReq,
          connector: getConfiguration({
            id: connector.id,
            name: connector.name,
            type: connector.actionTypeId,
            fields: { urgency: null, impact: null, severity: null },
          }).connector,
        })
        .expect(200);

      const { body } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/_push`)
        .set('kbn-xsrf', 'true')
        .send({
          connector_id: configure.connector.id,
          connector_name: configure.connector.name,
          external_id: 'external_id',
          external_title: 'external_title',
          external_url: 'external_url',
        })
        .expect(200);

      expect(body.connector.id).to.eql(configure.connector.id);
      expect(body.external_service.pushed_by).to.eql(defaultUser);
    });

    it('pushes a comment appropriately', async () => {
      const { body: connector } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send({
          ...getServiceNowConnector(),
          config: { apiUrl: servicenowSimulatorURL },
        })
        .expect(200);

      actionsRemover.add('default', connector.id, 'action', 'actions');

      const { body: configure } = await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(
          getConfiguration({
            id: connector.id,
            name: connector.name,
            type: connector.actionTypeId,
          })
        )
        .expect(200);

      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...postCaseReq,
          connector: getConfiguration({
            id: connector.id,
            name: connector.name,
            type: connector.actionTypeId,
            fields: { urgency: null, impact: null, severity: null },
          }).connector,
        })
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/_push`)
        .set('kbn-xsrf', 'true')
        .send({
          connector_id: configure.connector.id,
          connector_name: configure.connector.name,
          external_id: 'external_id',
          external_title: 'external_title',
          external_url: 'external_url',
        })
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/_push`)
        .set('kbn-xsrf', 'true')
        .send({
          connector_id: configure.connector.id,
          connector_name: configure.connector.name,
          external_id: 'external_id',
          external_title: 'external_title',
          external_url: 'external_url',
        })
        .expect(200);

      expect(body.comments[0].pushed_by).to.eql(defaultUser);
    });

    it('unhappy path - 404s when case does not exist', async () => {
      await supertest
        .post(`${CASES_URL}/fake-id/_push`)
        .set('kbn-xsrf', 'true')
        .send({
          connector_id: 'connector_id',
          connector_name: 'connector_name',
          external_id: 'external_id',
          external_title: 'external_title',
          external_url: 'external_url',
        })
        .expect(404);
    });

    it('unhappy path - 400s when bad data supplied', async () => {
      await supertest
        .post(`${CASES_URL}/fake-id/_push`)
        .set('kbn-xsrf', 'true')
        .send({
          badKey: 'connector_id',
        })
        .expect(400);
    });

    it('unhappy path = 409s when case is closed', async () => {
      const { body: configure } = await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(getConfiguration())
        .expect(200);

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
              status: 'closed',
            },
          ],
        })
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/_push`)
        .set('kbn-xsrf', 'true')
        .send({
          connector_id: configure.connector.id,
          connector_name: configure.connector.name,
          external_id: 'external_id',
          external_title: 'external_title',
          external_url: 'external_url',
        })
        .expect(409);
    });
  });
};
