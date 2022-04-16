/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ConnectorTypes } from '@kbn/cases-plugin/common/api';
import { getPostCaseRequest, nullUser, postCaseResp } from '../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  createCase,
  removeServerGeneratedPropertiesFromCase,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('post_case', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should post a case in space1', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({
          connector: {
            id: '123',
            name: 'Jira',
            type: ConnectorTypes.jira,
            fields: { issueType: 'Task', priority: 'High', parent: null },
          },
        }),
        200,
        authSpace1
      );
      const data = removeServerGeneratedPropertiesFromCase(postedCase);

      expect(data).to.eql({
        ...postCaseResp(
          null,
          getPostCaseRequest({
            connector: {
              id: '123',
              name: 'Jira',
              type: ConnectorTypes.jira,
              fields: { issueType: 'Task', priority: 'High', parent: null },
            },
          })
        ),
        created_by: nullUser,
      });
    });
  });
};
