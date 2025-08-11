/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '@kbn/security-solution-plugin/common/constants';
import { BulkActionTypeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import moment from 'moment';
import { getCustomQueryRuleParams, getSimpleRule } from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../config/services/detections_response';

import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { deleteAllGaps } from '../../../utils/event_log/delete_all_gaps';
import { GapEvent, generateGapsForRule } from '../../../utils/event_log/generate_gaps_for_rule';
import { getGapsByRuleId } from '../../../../../config/services/detections_response/rules/get_gaps_by_rule_id';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const es = getService('es');
  const log = getService('log');
  const esArchiver = getService('esArchiver');

  const postBulkAction = () =>
    supertest
      .post(DETECTION_ENGINE_RULES_BULK_ACTION)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31');

  describe('@ess @serverless @skipInServerless Bulk fill rule execution gaps', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
    });

    afterEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
    });

    describe('@skipInServerlessMKI fill gaps run action', () => {
      const intervalInMinutes = 5;
      const interval = `${intervalInMinutes}m`;
      const totalRules = 3;
      type GapFromEvent = GapEvent['kibana']['alert']['rule']['gap'] & { _id: string };
      let generatedGapEvents: Record<
        string,
        { rule: { id: string; name: string }; gapEvents: GapFromEvent[] }
      >;

      let backfillStart: Date;
      let backfillEnd: Date;
      let createdRules: Array<Awaited<ReturnType<typeof createRule>>>;
      let createdRuleIds: string[];

      const resetEverything = async () => {
        await deleteAllGaps(es);
        await deleteAllRules(supertest, log);
      };

      afterEach(resetEverything);

      beforeEach(async () => {
        createdRules = [];

        for (let idx = 0; idx < totalRules; idx++) {
          const rule = await createRule(
            supertest,
            log,
            getCustomQueryRuleParams({
              rule_id: idx.toString(),
              enabled: true,
              interval,
            }),
            'default'
          );

          createdRules.push(rule);

          backfillEnd = new Date();
          backfillStart = new Date(backfillEnd.getTime() - 24 * 60 * 60 * 1000);
        }

        createdRuleIds = createdRules.map(({ id }) => id);
      });

      describe('scheduling gap fills for rules', () => {
        beforeEach(async () => {
          generatedGapEvents = {};
          for (const rule of createdRules) {
            const { gapEvents } = await generateGapsForRule(es, rule, 100);
            generatedGapEvents[rule.id] = {
              rule,
              gapEvents: gapEvents.map((gapEvent) => {
                if (!gapEvent._id) {
                  throw new Error('generated gap event id cannot be undefined');
                }
                return { ...gapEvent.kibana.alert.rule.gap, _id: gapEvent._id };
              }),
            };
          }

          let earliest = Date.now();
          let latest = 0;

          Object.values(generatedGapEvents).forEach(({ gapEvents }) => {
            gapEvents
              .flatMap((event) => event.unfilled_intervals)
              .forEach(({ gte, lte }) => {
                earliest = Math.min(earliest, new Date(gte).getTime());
                latest = Math.max(latest, new Date(lte).getTime());
              });
          });

          backfillEnd = new Date(latest);
          backfillStart = new Date(earliest);
        });

        it('should trigger the scheduling of gap fills for the rules in the request', async () => {
          // Only backfill the first 2 rules
          const ruleIdsToBackfill = Object.keys(generatedGapEvents).slice(0, 2);

          // Trigger the backfill for the selected rules
          const { body } = await securitySolutionApi
            .performRulesBulkAction({
              query: {},
              body: {
                ids: ruleIdsToBackfill,
                action: BulkActionTypeEnum.fill_gaps,
                [BulkActionTypeEnum.fill_gaps]: {
                  start_date: backfillStart.toISOString(),
                  end_date: backfillEnd.toISOString(),
                },
              },
            })
            .expect(200);

          expect(body.success).toEqual(true);
          expect(body.attributes.summary).toEqual({
            failed: 0,
            succeeded: 2,
            skipped: 0,
            total: 2,
          });

          const expectedUpdatedRules = Object.values(generatedGapEvents)
            .slice(0, 2)
            .map((event) => event.rule);

          expect(body.attributes.results).toEqual({
            updated: expect.arrayContaining(
              expectedUpdatedRules.map((expected) => expect.objectContaining(expected))
            ),
            created: [],
            deleted: [],
            skipped: [],
          });

          for (const ruleId of ruleIdsToBackfill) {
            const fetchedGaps = await getGapsByRuleId(
              supertest,
              ruleId,
              { start: backfillStart.toISOString(), end: backfillEnd.toISOString() },
              100
            );

            const generatedGaps = generatedGapEvents[ruleId].gapEvents;

            // Verify that every single gap is marked as in progress
            generatedGaps.forEach((generatedGap) => {
              const fetchedGap = fetchedGaps.find(({ _id }) => _id === generatedGap._id);
              expect(fetchedGap?.unfilled_intervals).toEqual([]);
              expect(fetchedGap?.in_progress_intervals).toEqual(generatedGap.unfilled_intervals);
            });
          }

          // For the rules we didn't backfill, verify that their gaps are still unfilled
          for (const ruleId of Object.keys(generatedGapEvents).slice(2)) {
            const fetchedGaps = await getGapsByRuleId(
              supertest,
              ruleId,
              { start: backfillStart.toISOString(), end: backfillEnd.toISOString() },
              100
            );

            const generatedGaps = generatedGapEvents[ruleId].gapEvents;

            generatedGaps.forEach((generatedGap) => {
              const fetchedGap = fetchedGaps.find(({ _id }) => _id === generatedGap._id);
              expect(fetchedGap?.unfilled_intervals).toEqual(generatedGap.unfilled_intervals);
              expect(fetchedGap?.in_progress_intervals).toEqual([]);
            });
          }
        });

        it('should return 500 error if some rules do not exist', async () => {
          const existentRules = createdRuleIds;
          const nonExistentRule = 'non-existent-rule';
          const { body } = await securitySolutionApi
            .performRulesBulkAction({
              query: {},
              body: {
                ids: [...existentRules, nonExistentRule],
                action: BulkActionTypeEnum.fill_gaps,
                [BulkActionTypeEnum.fill_gaps]: {
                  start_date: backfillStart.toISOString(),
                  end_date: backfillEnd.toISOString(),
                },
              },
            })
            .expect(500);

          expect(body.attributes.summary).toEqual({
            failed: 1,
            skipped: 0,
            succeeded: existentRules.length,
            total: existentRules.length + 1,
          });

          expect(body.attributes.errors).toHaveLength(1);
          expect(body.attributes.errors[0]).toEqual({
            message: 'Rule not found',
            status_code: 500,
            rules: [
              {
                id: nonExistentRule,
              },
            ],
          });
        });

        it('should return 500 error if some rules are disabled', async () => {
          const enabledRules = createdRuleIds;
          const disabledRule = await createRule(
            supertest,
            log,
            getCustomQueryRuleParams({
              rule_id: 'rule-disabled',
              enabled: false,
              interval,
            })
          );

          await generateGapsForRule(es, disabledRule, 100);

          const { body } = await securitySolutionApi
            .performRulesBulkAction({
              query: {},
              body: {
                ids: [...enabledRules, disabledRule.id],
                action: BulkActionTypeEnum.fill_gaps,
                [BulkActionTypeEnum.fill_gaps]: {
                  start_date: backfillStart.toISOString(),
                  end_date: backfillEnd.toISOString(),
                },
              },
            })
            .expect(500);

          expect(body.attributes.summary).toEqual({
            failed: 1,
            skipped: 0,
            succeeded: enabledRules.length,
            total: enabledRules.length + 1,
          });

          expect(body.attributes.errors).toHaveLength(1);
          expect(body.attributes.errors).toEqual(
            expect.arrayContaining([
              {
                message: 'Cannot bulk fill gaps for a disabled rule',
                status_code: 500,
                err_code: 'RULE_FILL_GAPS_DISABLED_RULE',
                rules: [{ id: disabledRule.id, name: disabledRule.name }],
              },
            ])
          );

          const expectedUpdatedRules = Object.values(generatedGapEvents).map((event) => event.rule);
          expect(body.attributes.results).toEqual({
            updated: expect.arrayContaining(
              expectedUpdatedRules.map((expected) => expect.objectContaining(expected))
            ),
            created: [],
            deleted: [],
            skipped: [],
          });
        });
      });

      it('should return 400 error when the end date is not strictly greater than the start date', async () => {
        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: createdRuleIds,
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
                start_date: backfillStart.toISOString(),
                end_date: backfillStart.toISOString(),
              },
            },
          })
          .expect(400);

        expect(body.message).toContain('Backfill end must be greater than backfill start');
      });

      it('should return 400 error when start date is in the future', async () => {
        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: createdRuleIds,
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
                start_date: new Date(Date.now() + 1000).toISOString(),
                end_date: backfillEnd.toISOString(),
              },
            },
          })
          .expect(400);

        expect(body.message).toContain('Backfill cannot be scheduled for the future');
      });

      it('should return 400 error when end date is in the future', async () => {
        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: createdRuleIds,
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
                start_date: backfillStart.toISOString(),
                end_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              },
            },
          })
          .expect(400);

        expect(body.message).toContain('Backfill cannot be scheduled for the future');
      });

      it('should return 400 error when range between start and end are greater than 90 days', async () => {
        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: {},
            body: {
              ids: createdRuleIds,
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
                start_date: new Date(
                  backfillEnd.getTime() - 1 - 90 * 24 * 60 * 60 * 1000
                ).toISOString(),
                end_date: backfillEnd.toISOString(),
              },
            },
          })
          .expect(400);

        expect(body.message).toContain('Backfill cannot look back more than 90 days');
      });
    });

    describe('@skipInServerless @skipInServerlessMKI fill gaps run action in dry-run mode', () => {
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
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
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
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
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
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
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
          err_code: 'RULE_FILL_GAPS_DISABLED_RULE',
          message: 'Cannot bulk fill gaps for a disabled rule',
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

    describe('gaps_range filtering', () => {
      it('should not affect rules without gaps when using gaps_range filters', async () => {
        // Create two rules without gaps
        await createRule(supertest, log, {
          ...getSimpleRule('rule-without-gaps-1'),
        });
        await createRule(supertest, log, {
          ...getSimpleRule('rule-without-gaps-2'),
        });

        // Execute bulk action with gaps range filter
        const { body } = await postBulkAction().send({
          query: '',
          action: BulkActionTypeEnum.duplicate,
          gaps_range_start: '2025-01-01T00:00:00.000Z',
          gaps_range_end: '2025-01-02T00:00:00.000Z',
          duplicate: { include_exceptions: false, include_expired_exceptions: false },
        });

        // Verify the summary shows no rules were processed
        expect(body.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 0,
          total: 0,
        });
      });
    });
  });
};
