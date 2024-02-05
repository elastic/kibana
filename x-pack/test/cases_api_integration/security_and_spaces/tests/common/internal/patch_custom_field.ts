/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CustomFieldTypes } from '@kbn/cases-plugin/common/types/domain';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createConfiguration,
  getConfigurationRequest,
  updateCustomField,
} from '../../../../common/lib/api';
import { secOnly } from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('patch_custom_field', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('basic tests', () => {
      it('should patch a text customField', async () => {
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
        const patchedCases = await updateCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field_1',
          params: {
            version: postedCase.version,
            customFieldDetails: {
              type: CustomFieldTypes.TEXT,
              value: 'this is updated text field value',
            },
          },
        });

        expect(patchedCases[0].customFields).to.eql([
          {
            key: 'test_custom_field_1',
            type: CustomFieldTypes.TEXT,
            value: 'this is updated text field value',
          },
          {
            key: 'test_custom_field_2',
            type: CustomFieldTypes.TOGGLE,
            value: true,
          },
        ]);
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
        const patchedCases = await updateCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field_2',
          params: {
            version: postedCase.version,
            customFieldDetails: {
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
          },
        });

        expect(patchedCases[0].customFields).to.eql([
          {
            key: 'test_custom_field_1',
            type: CustomFieldTypes.TEXT,
            value: 'text field value',
          },
          {
            key: 'test_custom_field_2',
            type: CustomFieldTypes.TOGGLE,
            value: false,
          },
        ]);
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

        await updateCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'random_key',
          params: {
            version: postedCase.version,
            customFieldDetails: {
              type: CustomFieldTypes.TEXT,
              value: 'this is updated text field value',
            },
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

        await updateCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field',
          params: {
            version: postedCase.version,
            customFieldDetails: {
              type: CustomFieldTypes.TEXT,
              value: null,
            },
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

        await updateCustomField({
          supertest,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field',
          params: {
            version: postedCase.version,
            customFieldDetails: {
              type: CustomFieldTypes.TOGGLE,
              value: null,
            },
          },
          expectedHttpCode: 400,
        });
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should update a case when the user has the correct permissions', async () => {
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

        const patchedCases = await updateCustomField({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          customFieldId: 'test_custom_field',
          params: {
            version: postedCase.version,
            customFieldDetails: {
              type: CustomFieldTypes.TEXT,
              value: 'this is updated text field value',
            },
          },
          auth: { user: secOnly, space: 'space1' },
        });

        expect(patchedCases[0].owner).to.eql('securitySolutionFixture');
      });
    });
  });
};
