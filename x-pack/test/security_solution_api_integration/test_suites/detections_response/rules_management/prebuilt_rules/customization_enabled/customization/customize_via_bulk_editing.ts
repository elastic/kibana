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
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { deleteAllPrebuiltRuleAssets, installMockPrebuiltRules } from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerless Customize via bulk editing', () => {
    before(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

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
        value: ['test-tag'],
      },
      {
        type: BulkActionEditTypeEnum.delete_index_patterns,
        // Testing index pattern removal requires as minimum of two index patterns
        // to have a valid rule after the edit.
        value: ['index-1'],
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
        type: BulkActionEditTypeEnum.set_timeline,
        value: { timeline_id: 'mock-id', timeline_title: 'mock-title' },
      },
      {
        type: BulkActionEditTypeEnum.set_schedule,
        value: { interval: '1m', lookback: '1m' },
      },
    ];

    bulkEditingCases.forEach(({ type, value }) => {
      it(`applies "${type}" bulk edit action to prebuilt rules`, async () => {
        await installMockPrebuiltRules(supertest, es);

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

        const { body } = await securitySolutionApi
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
          .expect(200);

        expect(body).toMatchObject({
          success: true,
          rules_count: 1,
        });
        expect(body.attributes.summary).toMatchObject({ succeeded: 1, total: 1 });
      });
    });
  });
};
