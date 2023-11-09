/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CustomFieldTypes } from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq, findCasesResp } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  searchCases,
  createCase,
  createConfiguration,
  getConfigurationRequest,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('search_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });
    
    describe('basic tests', () => {
      it('filters by single customField', async () => {
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
                  required: true,
                },
              ],
            },
          })
        );

        await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: null,
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
          ],
        });

        const postedCase = await createCase(supertest, {
          ...postCaseReq,
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
          ],
        });

        const cases = await searchCases({
          supertest,
          body: { customFields: { valid_key_2: [true] } },
        });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [postedCase],
          count_open_cases: 1,
        });
      });

      it('filters by multiple customField', async () => {
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
                  required: true,
                },
                {
                  key: 'valid_key_3',
                  label: 'another_toggle',
                  type: CustomFieldTypes.TOGGLE,
                  required: false,
                },
              ],
            },
          })
        );

        await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: null,
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
            {
              key: 'valid_key_3',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
        });

        const postedCase2 = await createCase(supertest, {
          ...postCaseReq,
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
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
          ],
        });

        const cases = await searchCases({
          supertest,
          body: { customFields: { valid_key_2: [true], valid_key_3: [false] } },
        });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [postedCase2],
          count_open_cases: 1,
        });
      });

      it('filters by customField and tags', async () => {
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
                  required: true,
                },
              ],
            },
          })
        );

        await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: null,
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: false,
            },
          ],
        });

        const postedCase = await createCase(supertest, {
          ...postCaseReq,
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
          ],
          tags: ['unique'],
        });

        const cases = await searchCases({
          supertest,
          body: { customFields: { valid_key_2: [true] }, tags: ['unique'] },
        });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 1,
          cases: [postedCase],
          count_open_cases: 1,
        });
      });
    });

    describe('errors', () => {
      it('unhappy path - 400s when configuration is empty', async () => {
        await createConfiguration(supertest, getConfigurationRequest({}));
        await searchCases({
          supertest,
          body: { customFields: { random_key: [false] } },
          expectedHttpCode: 400,
        });
      });

      it('unhappy path - 400s when invalid custom field key passed', async () => {
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
                  required: true,
                },
              ],
            },
          })
        );

        await searchCases({
          supertest,
          body: { customFields: { random_key: [false] } },
          expectedHttpCode: 400,
        });
      });

      it('unhappy path - 400s when invalid value of custom field', async () => {
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
                  required: true,
                },
              ],
            },
          })
        );

        await searchCases({
          supertest,
          body: { customFields: { valid_key_2: [1234] } },
          expectedHttpCode: 403,
        });
      });

      it('unhappy path - 400s when custom field type is non filterable', async () => {
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
                  required: true,
                },
              ],
            },
          })
        );

        await searchCases({
          supertest,
          body: { customFields: { valid_key_1: ['hello!'] } },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
