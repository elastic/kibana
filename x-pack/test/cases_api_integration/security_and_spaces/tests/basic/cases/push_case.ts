/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { postCaseReq } from '../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  deleteConfiguration,
  getConfigurationRequest,
  getServiceNowConnector,
  createConnector,
  createConfiguration,
  createCase,
  pushCase,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('push_case', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteConfiguration(es);
      await deleteCasesUserActions(es);
    });

    it('should get 403 when trying to create a connector', async () => {
      await createConnector({ supertest, req: getServiceNowConnector(), expectedHttpCode: 403 });
    });

    it('should get 404 when trying to push to a case without a valid connector id', async () => {
      await createConfiguration(
        supertest,
        getConfigurationRequest({
          id: 'not-exist',
          name: 'Not exist',
          type: ConnectorTypes.serviceNowITSM,
        })
      );

      const postedCase = await createCase(supertest, {
        ...postCaseReq,
        connector: {
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
        },
      });

      await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: 'not-exist',
        expectedHttpCode: 404,
      });
    });
  });
};
