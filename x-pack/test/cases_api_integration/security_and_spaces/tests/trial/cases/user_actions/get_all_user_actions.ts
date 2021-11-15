/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../../common/ftr_provider_context';

import { CASE_CONFIGURE_URL, CASES_URL } from '../../../../../../../plugins/cases/common/constants';
import { defaultUser, postCaseReq } from '../../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  deleteConfiguration,
  getConfigurationRequest,
  getServiceNowConnector,
  getServiceNowSimulationServer,
} from '../../../../../common/lib/utils';

import { ObjectRemover as ActionsRemover } from '../../../../../../alerting_api_integration/common/lib';
import { getCreateConnectorUrl } from '../../../../../../../plugins/cases/common/utils/connectors_api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const actionsRemover = new ActionsRemover(supertest);

  describe('get_all_user_actions', () => {
    let serviceNowSimulatorURL: string = '';
    let serviceNowServer: http.Server;

    before(async () => {
      const { server, url } = await getServiceNowSimulationServer();
      serviceNowServer = server;
      serviceNowSimulatorURL = url;
    });

    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteConfiguration(es);
      await deleteCasesUserActions(es);
      await actionsRemover.removeAll();
    });

    after(async () => {
      serviceNowServer.close();
    });

    it(`on new push to service, user action: 'push-to-service' should be called with actionFields: ['pushed']`, async () => {
      const { body: connector } = await supertest
        .post(getCreateConnectorUrl())
        .set('kbn-xsrf', 'true')
        .send({
          ...getServiceNowConnector(),
          config: { apiUrl: serviceNowSimulatorURL },
        })
        .expect(200);

      actionsRemover.add('default', connector.id, 'action', 'actions');

      const { body: configure } = await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(
          getConfigurationRequest({
            id: connector.id,
            name: connector.name,
            type: connector.connector_type_id,
          })
        )
        .expect(200);

      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...postCaseReq,
          connector: getConfigurationRequest({
            id: connector.id,
            name: connector.name,
            type: connector.connector_type_id,
            fields: {
              urgency: '2',
              impact: '2',
              severity: '2',
              category: 'software',
              subcategory: 'os',
            },
          }).connector,
        })
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/connector/${connector.id}/_push`)
        .set('kbn-xsrf', 'true')
        .send({})
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.eql(2);
      expect(body[1].action_field).to.eql(['pushed']);
      expect(body[1].action).to.eql('push-to-service');
      expect(body[1].old_value).to.eql(null);
      expect(body[1].old_val_connector_id).to.eql(null);
      expect(body[1].new_val_connector_id).to.eql(configure.connector.id);
      const newValue = JSON.parse(body[1].new_value);
      expect(newValue).to.not.have.property('connector_id');
      expect(newValue.pushed_by).to.eql(defaultUser);
    });
  });
};
