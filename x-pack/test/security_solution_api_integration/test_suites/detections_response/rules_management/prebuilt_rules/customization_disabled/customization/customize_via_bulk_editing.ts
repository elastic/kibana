/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  BulkActionTypeEnum,
  BulkActionEditTypeEnum,
  BulkActionEditPayload,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import { installMockPrebuiltRules } from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const securitySolutionApi = getService('securitySolutionApi');

  const fetchPrebuiltRule = async () => {
    const {
      body: {
        data: [prebuiltRule],
      },
    } = await securitySolutionApi.findRules({
      query: {
        filter: 'alert.attributes.params.immutable: true',
        per_page: 1,
      },
    });

    return prebuiltRule;
  };

  describe('@ess @serverless @skipInServerless Customize via bulk editing', () => {
    const bulkEditingCases = [
      {
        type: BulkActionEditTypeEnum.add_tags,
        value: ['new-tag'],
      },
      {
        type: BulkActionEditTypeEnum.set_tags,
        value: ['new-tag'],
      },
      {
        type: BulkActionEditTypeEnum.delete_tags,
        value: ['new-tag'],
      },
      {
        type: BulkActionEditTypeEnum.add_index_patterns,
        value: ['test-*'],
      },
      {
        type: BulkActionEditTypeEnum.set_index_patterns,
        value: ['test-*'],
      },
      {
        type: BulkActionEditTypeEnum.delete_index_patterns,
        // We have to make sure rule has non empty index patterns after this action
        // otherwise API returns 500 error
        value: ['unknown-*'],
      },
      {
        type: BulkActionEditTypeEnum.set_timeline,
        value: { timeline_id: 'mock-id', timeline_title: 'mock-title' },
      },
      {
        type: BulkActionEditTypeEnum.set_schedule,
        value: { interval: '1m', lookback: '1m' },
      },
    ];

    bulkEditingCases.forEach(({ type, value }) => {
      it(`returns an error after applying "${type}" bulk edit action to prebuilt rules`, async () => {
        await installMockPrebuiltRules(supertest, es);

        const prebuiltRule = await fetchPrebuiltRule();

        await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [prebuiltRule.id],
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type,
                  value,
                } as BulkActionEditPayload,
              ],
            },
          })
          .expect(500);
      });
    });

    // if rule action is applied together with another edit action, that can't be applied to prebuilt rule (for example: tags action)
    // bulk edit request should return error
    it(`returns an error if one of edit action is not eligible for prebuilt rule`, async () => {
      const webHookAction = {
        // Higher license level is required for creating connectors
        // Using the pre-configured connector for testing
        id: 'my-test-email',
        group: 'default',
        params: {
          body: '{"test":"action to be saved in a rule"}',
        },
      };

      await installMockPrebuiltRules(supertest, es);
      const prebuiltRule = await fetchPrebuiltRule();

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          query: {},
          body: {
            ids: [prebuiltRule.id],
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_rule_actions,
                value: {
                  throttle: '1h',
                  actions: [webHookAction],
                },
              },
              {
                type: BulkActionEditTypeEnum.set_tags,
                value: ['tag-1'],
              },
            ],
          },
        })
        .expect(500);

      expect(body.attributes.summary).toEqual({
        failed: 1,
        skipped: 0,
        succeeded: 0,
        total: 1,
      });
      expect(body.attributes.errors[0]).toEqual({
        message: "Elastic rule can't be edited",
        status_code: 500,
        rules: [
          {
            id: prebuiltRule.id,
            name: prebuiltRule.name,
          },
        ],
      });

      // Check that the updates were not made
      const { body: readRule } = await securitySolutionApi
        .readRule({ query: { rule_id: prebuiltRule.rule_id } })
        .expect(200);

      expect(readRule.actions).toEqual(prebuiltRule.actions);
      expect(readRule.tags).toEqual(prebuiltRule.tags);
      expect(readRule.version).toBe(prebuiltRule.version);
    });
  });
};
