/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS } from '@kbn/security-solution-plugin/common/constants';
import { BulkActionTypeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import moment from 'moment';
import { getCustomQueryRuleParams } from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../config/services/detections_response';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const esArchiver = getService('esArchiver');

  describe('@ess @serverless @skipInServerless Bulk run rules manually', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
    });

    afterEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
    });

    // skipped on MKI since feature flags are not supported there
    describe('@skipInServerlessMKI manual rule run action', () => {
      it('should return all existing and enabled rules as succeeded', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              query: '',
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(200);

        expect(body.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 2,
          total: 2,
        });
        expect(body.attributes.errors).toBeUndefined();
      });

      it('should return 400 error when start date > end date', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: endDate.toISOString(),
                end_date: startDate.toISOString(),
              },
            },
          })
          .expect(400);

        expect(body.message).toContain('[0]: Backfill end must be greater than backfill start');
      });

      it('should return 400 error when start date = end date', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment().subtract(1, 'h');
        const startDate = endDate.clone();

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(400);

        expect(body.message).toContain('[0]: Backfill end must be greater than backfill start');
      });

      it('should return 400 error when start date is in the future', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const startDate = moment().add(1, 'd');
        const endDate = moment().add(2, 'd');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(400);

        expect(body.message).toContain('[0]: Backfill cannot be scheduled for the future');
      });

      it('should return 400 error when end date is in the future', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment().add(1, 'd');
        const startDate = moment().subtract(1, 'd');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(400);

        expect(body.message).toContain('[0]: Backfill cannot be scheduled for the future');
      });

      it('should return 400 error when start date is far in the past', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = moment().subtract(MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS + 1, 'd');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(400);

        expect(body.message).toContain(
          `[0]: Backfill cannot look back more than ${MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS} days`
        );
      });

      it('should return 500 error if some rules do not exist', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [createdRule1.id, 'rule-2'],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 1,
          total: 2,
        });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors[0]).toEqual({
          message: 'Rule not found',
          status_code: 500,
          rules: [
            {
              id: 'rule-2',
            },
          ],
        });
      });

      it('should return 500 error if some rules are disabled', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: false,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 1,
          total: 2,
        });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors).toEqual(
          expect.arrayContaining([
            {
              message: 'Cannot schedule manual rule run for a disabled rule',
              status_code: 500,
              err_code: 'MANUAL_RULE_RUN_DISABLED_RULE',
              rules: [{ id: createdRule1.id, name: createdRule1.name }],
            },
          ])
        );
        expect(body.attributes.results).toEqual({
          updated: [expect.objectContaining(createdRule2)],
          created: [],
          deleted: [],
          skipped: [],
        });
      });
    });

    describe('@skipInServerless @skipInServerlessMKI manual rule run action in dry-run mode', () => {
      it('should return all existing and enabled rules as succeeded', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(200);

        expect(body.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 2,
          total: 2,
        });
        expect(body.attributes.errors).toBeUndefined();
      });

      it('should return 500 error if some rules do not exist', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule1.id, 'rule-2'],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 1,
          total: 2,
        });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors[0]).toEqual({
          message: 'Rule not found',
          status_code: 500,
          rules: [
            {
              id: 'rule-2',
            },
          ],
        });
      });

      it('should return 500 error if some rules are disabled', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: false,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 1,
          total: 2,
        });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors[0]).toEqual({
          err_code: 'MANUAL_RULE_RUN_DISABLED_RULE',
          message: 'Cannot schedule manual rule run for a disabled rule',
          status_code: 500,
          rules: [
            {
              id: createdRule1.id,
              name: createdRule1.name,
            },
          ],
        });
      });
    });
  });
};
