/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from '@kbn/expect';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import {
  ConnectorTypes,
  ConnectorJiraTypeFields,
  CaseStatuses,
  CaseUserActionResponse,
  CaseType,
} from '../../../../../../plugins/cases/common/api';
import { getPostCaseRequest, postCaseResp, defaultUser } from '../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  createCase,
  removeServerGeneratedPropertiesFromCase,
  removeServerGeneratedPropertiesFromUserAction,
  getCaseUserActions,
} from '../../../../common/lib/utils';
import {
  secOnly,
  secOnlyRead,
  globalRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
  testDisabled,
} from '../../../../common/lib/authentication/users';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('post_case', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    describe('happy path', () => {
      it('should post a case', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({
            connector: {
              id: '123',
              name: 'Jira',
              type: ConnectorTypes.jira,
              fields: { issueType: 'Task', priority: 'High', parent: null },
            },
          })
        );
        const data = removeServerGeneratedPropertiesFromCase(postedCase);

        expect(data).to.eql(
          postCaseResp(
            null,
            getPostCaseRequest({
              connector: {
                id: '123',
                name: 'Jira',
                type: ConnectorTypes.jira,
                fields: { issueType: 'Task', priority: 'High', parent: null },
              },
            })
          )
        );
      });

      it('should post a case: none connector', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({
            connector: {
              id: 'none',
              name: 'none',
              type: ConnectorTypes.none,
              fields: null,
            },
          })
        );
        const data = removeServerGeneratedPropertiesFromCase(postedCase);

        expect(data).to.eql(
          postCaseResp(
            null,
            getPostCaseRequest({
              connector: {
                id: 'none',
                name: 'none',
                type: ConnectorTypes.none,
                fields: null,
              },
            })
          )
        );
      });

      it('should create a user action when creating a case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
        const creationUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[0]);

        const { new_value, ...rest } = creationUserAction as CaseUserActionResponse;
        const parsedNewValue = JSON.parse(new_value!);

        const { id: connectorId, ...restCaseConnector } = postedCase.connector;

        expect(rest).to.eql({
          action_field: [
            'description',
            'status',
            'tags',
            'title',
            'connector',
            'settings',
            'owner',
          ],
          action: 'create',
          action_by: defaultUser,
          old_value: null,
          old_val_connector_id: null,
          // the connector id will be null here because it the connector is none
          new_val_connector_id: null,
          case_id: `${postedCase.id}`,
          comment_id: null,
          sub_case_id: '',
          owner: 'securitySolutionFixture',
        });

        expect(parsedNewValue).to.eql({
          type: postedCase.type,
          description: postedCase.description,
          title: postedCase.title,
          tags: postedCase.tags,
          connector: restCaseConnector,
          settings: postedCase.settings,
          owner: postedCase.owner,
        });
      });

      it('creates the case without connector in the configuration', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const data = removeServerGeneratedPropertiesFromCase(postedCase);

        expect(data).to.eql(postCaseResp());
      });
    });

    describe('unhappy path', () => {
      it('should not allow creating a collection style case', async () => {
        await createCase(supertest, getPostCaseRequest({ type: CaseType.collection }), 400);
      });

      it('400s when bad query supplied', async () => {
        await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          // @ts-expect-error
          .send({ ...getPostCaseRequest({ badKey: true }) })
          .expect(400);
      });

      it('400s when connector is not supplied', async () => {
        const { connector, ...caseWithoutConnector } = getPostCaseRequest();

        await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(caseWithoutConnector)
          .expect(400);
      });

      it('400s when connector has wrong type', async () => {
        await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            ...getPostCaseRequest({
              // @ts-expect-error
              connector: { id: 'wrong', name: 'wrong', type: '.not-exists', fields: null },
            }),
          })
          .expect(400);
      });

      it('400s when connector has wrong fields', async () => {
        await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            ...getPostCaseRequest({
              // @ts-expect-error
              connector: {
                id: 'wrong',
                name: 'wrong',
                type: ConnectorTypes.jira,
                fields: { unsupported: 'value' },
              } as ConnectorJiraTypeFields,
            }),
          })
          .expect(400);
      });

      it('400s when missing title', async () => {
        const { title, ...caseWithoutTitle } = getPostCaseRequest();

        await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(caseWithoutTitle).expect(400);
      });

      it('400s when missing description', async () => {
        const { description, ...caseWithoutDescription } = getPostCaseRequest();

        await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(caseWithoutDescription)
          .expect(400);
      });

      it('400s when missing tags', async () => {
        const { tags, ...caseWithoutTags } = getPostCaseRequest();

        await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(caseWithoutTags).expect(400);
      });

      it('400s if you passing status for a new case', async () => {
        const req = getPostCaseRequest();

        await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({ ...req, status: CaseStatuses.open })
          .expect(400);
      });

      it('400s if the title is too long', async () => {
        const longTitle =
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nulla enim, rutrum sit amet euismod venenatis, blandit et massa. Nulla id consectetur enim.';

        await createCase(supertest, getPostCaseRequest({ title: longTitle }), 400);
      });
    });

    describe('rbac', () => {
      it('returns a 403 when attempting to create a case with an owner that was from a disabled feature in the space', async () => {
        const theCase = (await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'testDisabledFixture' }),
          403,
          {
            user: testDisabled,
            space: 'space1',
          }
        )) as unknown as { message: string };

        expect(theCase.message).to.eql(
          'Unauthorized to create case with owners: "testDisabledFixture"'
        );
      });

      it('User: security solution only - should create a case', async () => {
        const theCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );
        expect(theCase.owner).to.eql('securitySolutionFixture');
      });

      it('User: security solution only - should NOT create a case of different owner', async () => {
        await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          403,
          {
            user: secOnly,
            space: 'space1',
          }
        );
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT create a case`, async () => {
          await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            403,
            {
              user,
              space: 'space1',
            }
          );
        });
      }

      it('should NOT create a case in a space with no permissions', async () => {
        await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          403,
          {
            user: secOnly,
            space: 'space2',
          }
        );
      });
    });
  });
};
