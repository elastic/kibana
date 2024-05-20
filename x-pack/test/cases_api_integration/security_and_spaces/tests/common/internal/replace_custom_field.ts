/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CustomFieldTypes } from '@kbn/cases-plugin/common/types/domain';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createConfiguration,
  getConfigurationRequest,
  replaceCustomField,
} from '../../../../common/lib/api';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('replace_custom_field', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('basic tests', () => {
      it('should replace a text customField', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'test_custom_field_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'test_custom_field_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                },
              ],
            },
          })
        );

        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'test_custom_field_1',
              type: CustomFieldTypes.TEXT,
              value: 'text field value',
            },
            {
              key: 'test_custom_field_2',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
        });
        const replacedCustomField = await replaceCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field_1',
          params: {
            value: 'this is updated text field value',
            caseVersion: postedCase.version,
          },
        });

        expect(replacedCustomField).to.eql({
          key: 'test_custom_field_1',
          type: CustomFieldTypes.TEXT,
          value: 'this is updated text field value',
        });
      });

      it('should patch a toggle customField', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'test_custom_field_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'test_custom_field_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: true,
                },
              ],
            },
          })
        );

        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'test_custom_field_1',
              type: CustomFieldTypes.TEXT,
              value: 'text field value',
            },
            {
              key: 'test_custom_field_2',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
        });
        const replacedCustomField = await replaceCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field_2',
          params: {
            value: false,
            caseVersion: postedCase.version,
          },
        });

        expect(replacedCustomField).to.eql({
          key: 'test_custom_field_2',
          type: CustomFieldTypes.TOGGLE,
          value: false,
        });
      });

      it('does not throw error when updating an optional custom field with a null value', async () => {
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

        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'test_custom_field',
              type: CustomFieldTypes.TEXT,
              value: 'hello',
            },
          ],
        });

        await replaceCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field',
          params: {
            caseVersion: postedCase.version,
            value: null,
          },
          expectedHttpCode: 200,
        });
      });
    });

    describe('errors', () => {
      it('400s when trying to patch with a custom field key that does not exist', async () => {
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
        const postedCase = await createCase(supertest, postCaseReq);

        await replaceCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'random_key',
          params: {
            caseVersion: postedCase.version,
            value: 'this is updated text field value',
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when trying to patch a case with a required custom field with null value', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'test_custom_field',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: true,
                },
              ],
            },
          })
        );

        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'test_custom_field',
              type: CustomFieldTypes.TEXT,
              value: 'hello',
            },
          ],
        });

        await replaceCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field',
          params: {
            caseVersion: postedCase.version,
            value: null,
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when trying to patch a case with a custom field with the wrong type', async () => {
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
        const postedCase = await createCase(supertest, postCaseReq);

        await replaceCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field',
          params: {
            caseVersion: postedCase.version,
            value: true,
          },
          expectedHttpCode: 400,
        });
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should replace the custom field when the user has the correct permissions', async () => {
        await createConfiguration(
          supertestWithoutAuth,
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
          }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, {
          user: secOnly,
          space: 'space1',
        });

        await replaceCustomField({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field',
          params: {
            caseVersion: postedCase.version,

            value: 'this is updated text field value',
          },
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 200,
        });
      });

      it('should not replace a custom field when the user does not have the correct ownership', async () => {
        await createConfiguration(
          supertestWithoutAuth,
          getConfigurationRequest({
            overrides: {
              owner: 'observabilityFixture',
              customFields: [
                {
                  key: 'test_custom_field',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
              ],
            },
          }),
          200,
          {
            user: obsOnly,
            space: 'space1',
          }
        );

        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({
            owner: 'observabilityFixture',
            customFields: [
              {
                key: 'test_custom_field',
                type: CustomFieldTypes.TEXT,
                value: 'hello',
              },
            ],
          }),
          200,
          { user: obsOnly, space: 'space1' }
        );

        await replaceCustomField({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field',
          params: {
            caseVersion: postedCase.version,
            value: 'this is updated text field value',
          },
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT replace a custom field`, async () => {
          await createConfiguration(
            supertestWithoutAuth,
            { ...getConfigurationRequest(), owner: 'observabilityFixture' },
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          await replaceCustomField({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            customFieldId: 'test_custom_field',
            params: {
              caseVersion: postedCase.version,
              value: 'this is updated text field value',
            },
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('should NOT replace a custom field in a space with no permissions', async () => {
        await createConfiguration(
          supertestWithoutAuth,
          { ...getConfigurationRequest(), owner: 'observabilityFixture' },
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        await replaceCustomField({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field',
          params: {
            caseVersion: postedCase.version,
            value: 'this is updated text field value',
          },
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
