/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import {
  CaseStatuses,
  CaseSeverity,
  CustomFieldTypes,
} from '@kbn/cases-plugin/common/types/domain';
import { ConnectorJiraTypeFields, ConnectorTypes } from '@kbn/cases-plugin/common/types/domain';
import { getPostCaseRequest, postCaseResp, defaultUser } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  removeServerGeneratedPropertiesFromCase,
  findCaseUserActions,
  removeServerGeneratedPropertiesFromUserAction,
  createConfiguration,
  getConfigurationRequest,
} from '../../../../common/lib/api';
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
      await deleteAllCaseItems(es);
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

      it('should post a case without severity', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const data = removeServerGeneratedPropertiesFromCase(postedCase);

        expect(data).to.eql(postCaseResp(null, getPostCaseRequest()));
      });

      it('should post a case with severity', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({
            severity: CaseSeverity.HIGH,
          })
        );
        const data = removeServerGeneratedPropertiesFromCase(postedCase);

        expect(data).to.eql(
          postCaseResp(
            null,
            getPostCaseRequest({
              severity: CaseSeverity.HIGH,
            })
          )
        );
      });

      it('should post a case with default category', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest()); // category is undefined
        const data = removeServerGeneratedPropertiesFromCase(postedCase);

        expect(data.category).to.eql(null);
      });

      it('should create a user action when creating a case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
        const creationUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[0]);

        expect(creationUserAction).to.eql({
          action: 'create',
          type: 'create_case',
          created_by: defaultUser,
          comment_id: null,
          owner: 'securitySolutionFixture',
          payload: {
            description: postedCase.description,
            title: postedCase.title,
            tags: postedCase.tags,
            connector: postedCase.connector,
            settings: postedCase.settings,
            owner: postedCase.owner,
            status: CaseStatuses.open,
            severity: CaseSeverity.LOW,
            assignees: [],
            category: null,
            customFields: [],
          },
        });
      });

      it('creates the case without connector in the configuration', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const data = removeServerGeneratedPropertiesFromCase(postedCase);

        expect(data).to.eql(postCaseResp());
      });

      it('should post a case with customFields', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  defaultValue: false,
                  required: true,
                },
                {
                  key: 'valid_key_3',
                  label: 'number',
                  type: CustomFieldTypes.NUMBER,
                  defaultValue: 123,
                  required: true,
                },
              ],
            },
          })
        );

        const res = await createCase(
          supertest,
          getPostCaseRequest({
            customFields: [
              {
                key: 'valid_key_1',
                type: CustomFieldTypes.TEXT,
                value: 'this is a text field value',
              },
              {
                key: 'valid_key_2',
                type: CustomFieldTypes.TOGGLE,
                value: true,
              },
              {
                key: 'valid_key_3',
                type: CustomFieldTypes.NUMBER,
                value: 123456,
              },
            ],
          })
        );

        expect(res.customFields).to.eql([
          {
            key: 'valid_key_1',
            type: CustomFieldTypes.TEXT,
            value: 'this is a text field value',
          },
          {
            key: 'valid_key_2',
            type: CustomFieldTypes.TOGGLE,
            value: true,
          },
          {
            key: 'valid_key_3',
            type: CustomFieldTypes.NUMBER,
            value: 123456,
          },
        ]);
      });

      it('should fill out missing custom fields', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'valid_key_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'valid_key_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  defaultValue: false,
                  required: true,
                },
                {
                  key: 'valid_key_3',
                  label: 'number',
                  type: CustomFieldTypes.NUMBER,
                  defaultValue: 123,
                  required: false,
                },
              ],
            },
          })
        );

        const res = await createCase(
          supertest,
          getPostCaseRequest({
            customFields: [
              {
                key: 'valid_key_2',
                type: CustomFieldTypes.TOGGLE,
                value: true,
              },
            ],
          })
        );

        expect(res.customFields).to.eql([
          { key: 'valid_key_2', type: 'toggle', value: true },
          { key: 'valid_key_1', type: 'text', value: null },
          { key: 'valid_key_3', type: 'number', value: 123 },
        ]);
      });

      it('creates a case with missing required custom fields and default values', async () => {
        const customFieldsConfiguration = [
          {
            key: 'text_custom_field',
            label: 'text',
            type: CustomFieldTypes.TEXT,
            defaultValue: 'default value',
            required: true,
          },
          {
            key: 'toggle_custom_field',
            label: 'toggle',
            type: CustomFieldTypes.TOGGLE,
            defaultValue: false,
            required: true,
          },
          {
            key: 'number_custom_field',
            label: 'number',
            type: CustomFieldTypes.NUMBER,
            defaultValue: 123,
            required: true,
          },
        ];

        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: customFieldsConfiguration,
            },
          })
        );
        const createdCase = await createCase(
          supertest,
          getPostCaseRequest({
            customFields: [],
          })
        );

        expect(createdCase.customFields).to.eql([
          {
            key: customFieldsConfiguration[0].key,
            type: customFieldsConfiguration[0].type,
            value: 'default value',
          },
          {
            key: customFieldsConfiguration[1].key,
            type: customFieldsConfiguration[1].type,
            value: false,
          },
          {
            key: customFieldsConfiguration[2].key,
            type: customFieldsConfiguration[2].type,
            value: 123,
          },
        ]);
      });

      it('creates a case with missing optional custom fields and default values', async () => {
        const customFieldsConfiguration = [
          {
            key: 'text_custom_field',
            label: 'text',
            type: CustomFieldTypes.TEXT,
            required: false,
            defaultValue: 'default value',
          },
          {
            key: 'toggle_custom_field',
            label: 'toggle',
            type: CustomFieldTypes.TOGGLE,
            defaultValue: false,
            required: false,
          },
          {
            key: 'number_custom_field',
            label: 'number',
            type: CustomFieldTypes.NUMBER,
            defaultValue: 123,
            required: false,
          },
        ];

        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: customFieldsConfiguration,
            },
          })
        );
        const createdCase = await createCase(
          supertest,
          getPostCaseRequest({
            customFields: [],
          })
        );

        expect(createdCase.customFields).to.eql([
          {
            key: customFieldsConfiguration[0].key,
            type: customFieldsConfiguration[0].type,
            value: 'default value',
          },
          {
            key: customFieldsConfiguration[1].key,
            type: customFieldsConfiguration[1].type,
            value: false,
          },
          {
            key: customFieldsConfiguration[2].key,
            type: customFieldsConfiguration[2].type,
            value: 123,
          },
        ]);
      });
    });

    describe('unhappy path', () => {
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

      it('400s when passing a wrong severity value', async () => {
        // @ts-expect-error
        await createCase(supertest, { ...getPostCaseRequest(), severity: 'very-severe' }, 400);
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
        const longTitle = 'a'.repeat(161);

        await createCase(supertest, getPostCaseRequest({ title: longTitle }), 400);
      });

      it('400s if the description is too long', async () => {
        const longDescription = 'a'.repeat(30001);

        await createCase(supertest, getPostCaseRequest({ description: longDescription }), 400);
      });

      describe('tags', () => {
        it('400s if the a tag is a whitespace', async () => {
          const tags = ['test', ' '];

          await createCase(supertest, getPostCaseRequest({ tags }), 400);
        });

        it('400s if the a tag is an empty string', async () => {
          const tags = ['test', ''];

          await createCase(supertest, getPostCaseRequest({ tags }), 400);
        });

        it('400s if the a tag is too long', async () => {
          const tag = 'a'.repeat(257);

          await createCase(supertest, getPostCaseRequest({ tags: [tag] }), 400);
        });

        it('400s if the a tags array is too long', async () => {
          const tags = Array(201).fill('foo');

          await createCase(supertest, getPostCaseRequest({ tags }), 400);
        });
      });

      describe('categories', () => {
        it('400s when the category is too long', async () => {
          await createCase(
            supertest,
            getPostCaseRequest({
              category: 'A very long category with more than fifty characters!',
            }),
            400
          );
        });

        it('400s when the category is an empty string', async () => {
          await createCase(
            supertest,
            getPostCaseRequest({
              category: '',
            }),
            400
          );
        });

        it('400s when the category is a string just with spaces', async () => {
          await createCase(
            supertest,
            getPostCaseRequest({
              category: '   ',
            }),
            400
          );
        });
      });

      describe('customFields', () => {
        it('400s when trying to patch with duplicated custom field keys', async () => {
          await createCase(
            supertest,
            getPostCaseRequest({
              customFields: [
                {
                  key: 'duplicated_key',
                  type: CustomFieldTypes.TEXT,
                  value: 'this is a text field value',
                },
                {
                  key: 'duplicated_key',
                  type: CustomFieldTypes.TEXT,
                  value: 'this is a text field value',
                },
              ],
            }),
            400
          );
        });

        it('400s when trying to create case with customField key that does not exist', async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                customFields: [
                  {
                    key: 'test_custom_field',
                    label: 'text',
                    type: CustomFieldTypes.TEXT,
                    required: false,
                  },
                ],
              },
            })
          );
          await createCase(
            supertest,
            getPostCaseRequest({
              customFields: [
                {
                  key: 'invalid_key',
                  type: CustomFieldTypes.TEXT,
                  value: 'this is a text field value',
                },
              ],
            }),
            400
          );
        });

        it('400s trying to create a case with required custom fields set to null', async () => {
          const customFieldsConfiguration = [
            {
              key: 'text_custom_field',
              label: 'text',
              type: CustomFieldTypes.TEXT,
              required: true,
              defaultValue: 'default value',
            },
            {
              key: 'toggle_custom_field',
              label: 'toggle',
              type: CustomFieldTypes.TOGGLE,
              defaultValue: false,
              required: true,
            },
            {
              key: 'number_custom_field',
              label: 'number',
              type: CustomFieldTypes.NUMBER,
              defaultValue: 123,
              required: true,
            },
          ];

          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                customFields: customFieldsConfiguration,
              },
            })
          );

          await createCase(
            supertest,
            getPostCaseRequest({
              customFields: [
                {
                  key: 'text_custom_field',
                  type: CustomFieldTypes.TEXT,
                  value: null,
                },
                {
                  key: 'toggle_custom_field',
                  type: CustomFieldTypes.TOGGLE,
                  value: null,
                },
                {
                  key: 'number_custom_field',
                  type: CustomFieldTypes.NUMBER,
                  value: null,
                },
              ],
            }),
            400
          );
        });

        it('400s when trying to create case with a custom field with the wrong type', async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                customFields: [
                  {
                    key: 'test_custom_field',
                    label: 'text',
                    type: CustomFieldTypes.TEXT,
                    defaultValue: 'foobar',
                    required: true,
                  },
                ],
              },
            })
          );

          await createCase(
            supertest,
            getPostCaseRequest({
              customFields: [
                {
                  key: 'test_custom_field',
                  type: CustomFieldTypes.TOGGLE,
                  value: true,
                },
              ],
            }),
            400
          );
        });
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
