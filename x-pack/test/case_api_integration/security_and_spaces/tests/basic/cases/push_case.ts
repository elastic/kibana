/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { CASE_CONFIGURE_URL, CASES_URL } from '../../../../../../plugins/cases/common/constants';

import { postCaseReq } from '../../../../common/lib/mock';
import {
  deleteCases,
  deleteCasesUserActions,
  deleteComments,
  deleteConfiguration,
  getConfiguration,
  getServiceNowConnector,
} from '../../../../common/lib/utils';
import { ConnectorTypes } from '../../../../../../plugins/cases/common/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('push_case', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteConfiguration(es);
      await deleteCasesUserActions(es);
    });

    it('should get 403 when trying to create a connector', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send({
          ...getServiceNowConnector(),
        })
        .expect(403);
    });

    it('should get 404 when trying to push to a case without a valid connector id', async () => {
      await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(
          getConfiguration({
            id: 'not-exist',
            name: 'Not exist',
            type: ConnectorTypes.serviceNowITSM,
          })
        )
        .expect(200);

      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...postCaseReq,
          connector: getConfiguration({
            id: 'not-exist',
            name: 'Not exist',
            type: ConnectorTypes.serviceNowITSM,
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
        .post(`${CASES_URL}/${postedCase.id}/connector/not-exist/_push`)
        .set('kbn-xsrf', 'true')
        .send({})
        .expect(404);
    });
  });
};
