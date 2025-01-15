/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '@kbn/security-solution-plugin/common/constants';
import { getCreateEsqlRulesSchemaMock } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema/mocks';

import expect from 'expect';
import {
  BulkActionTypeEnum,
  BulkActionEditTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  const postDryRunBulkAction = () =>
    supertest
      .post(DETECTION_ENGINE_RULES_BULK_ACTION)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31')
      .query({ dry_run: true });

  describe('@ess perform_bulk_action dry_run - ESS specific logic', () => {
    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('edit action', () => {
      describe('validate updating index pattern for ES|QL rule', () => {
        const actions = [
          BulkActionEditTypeEnum.add_index_patterns,
          BulkActionEditTypeEnum.set_index_patterns,
          BulkActionEditTypeEnum.delete_index_patterns,
        ];

        actions.forEach((editAction) => {
          it(`should return error if ${editAction} action is applied to ES|QL rule`, async () => {
            const esqlRule = await createRule(supertest, log, getCreateEsqlRulesSchemaMock());

            const { body } = await postDryRunBulkAction()
              .send({
                ids: [esqlRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: editAction,
                    value: [],
                  },
                ],
              })
              .expect(500);

            expect(body.attributes.summary).toEqual({
              failed: 1,
              skipped: 0,
              succeeded: 0,
              total: 1,
            });
            expect(body.attributes.results).toEqual({
              updated: [],
              skipped: [],
              created: [],
              deleted: [],
            });

            expect(body.attributes.errors).toHaveLength(1);
            expect(body.attributes.errors[0]).toEqual({
              err_code: 'ESQL_INDEX_PATTERN',
              message: "ES|QL rule doesn't have index patterns",
              status_code: 500,
              rules: [
                {
                  id: esqlRule.id,
                  name: esqlRule.name,
                },
              ],
            });
          });
        });
      });
    });
  });
};
