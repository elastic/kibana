/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type {
  ThreatMatchRuleCreateProps,
  ThresholdRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getInitialDetectionMetrics } from '@kbn/security-solution-plugin/server/usage/detections/get_initial_usage';
import { ELASTIC_SECURITY_RULE_ID } from '@kbn/security-solution-plugin/common';
import { RulesTypeUsage } from '@kbn/security-solution-plugin/server/usage/detections/rules/types';
import {
  createLegacyRuleAction,
  createWebHookRuleAction,
  getEqlRuleForAlertTesting,
  fetchRule,
  getRuleWithWebHookAction,
  getSimpleMlRule,
  getSimpleRule,
  getSimpleThreatMatch,
  getStats,
  getThresholdRuleForAlertTesting,
  installMockPrebuiltRules,
  updateRule,
  deleteAllEventLogExecutionEvents,
} from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
} from '../../../../../../common/utils/security_solution';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const es = getService('es');

  describe('@ess Detection rule legacy actions telemetry', () => {
    before(async () => {
      // Just in case other tests do not clean up the event logs, let us clear them now and here only once.
      await deleteAllEventLogExecutionEvents(es, log);
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    describe('"kql" rule type', () => {
      it('should show "notifications_enabled" to be "1" for rule that has at least "1" action(s) and the alert is "enabled"/"active"', async () => {
        const rule = getRuleForAlertTesting(['telemetry']);
        const hookAction = await createWebHookRuleAction(supertest);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, true, rule);
        const { id } = await createRule(supertest, log, ruleToCreate);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            query: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
              enabled: 1,
              alerts: 4,
              notifications_enabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              enabled: 1,
              alerts: 4,
              notifications_enabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_disabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getRuleForAlertTesting(['telemetry'], 'rule-1', false);
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createWebHookRuleAction(supertest);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            query: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
              disabled: 1,
              legacy_notifications_disabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              disabled: 1,
              legacy_notifications_disabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_enabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "enabled"/"active"', async () => {
        const rule = getRuleForAlertTesting(['telemetry']);
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createWebHookRuleAction(supertest);
        await createLegacyRuleAction(supertest, id, hookAction.id);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            query: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
              alerts: 4,
              enabled: 1,
              legacy_notifications_enabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              alerts: 4,
              enabled: 1,
              legacy_notifications_enabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });
    });

    describe('"eql" rule type', () => {
      it('should show "legacy_notifications_disabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getEqlRuleForAlertTesting(['telemetry'], 'rule-1', false);
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createWebHookRuleAction(supertest);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            eql: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.eql,
              disabled: 1,
              legacy_notifications_disabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              disabled: 1,
              legacy_notifications_disabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_enabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "enabled"/"active"', async () => {
        const rule = getEqlRuleForAlertTesting(['telemetry']);
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createWebHookRuleAction(supertest);
        await createLegacyRuleAction(supertest, id, hookAction.id);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            eql: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.eql,
              alerts: 4,
              enabled: 1,
              legacy_notifications_enabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              alerts: 4,
              enabled: 1,
              legacy_notifications_enabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });
    });

    describe('"threshold" rule type', () => {
      it('should show "legacy_notifications_disabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getThresholdRuleForAlertTesting(['telemetry'], 'rule-1', false),
          threshold: {
            field: 'keyword',
            value: 1,
          },
        };
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createWebHookRuleAction(supertest);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            threshold: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threshold,
              disabled: 1,
              legacy_notifications_disabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              disabled: 1,
              legacy_notifications_disabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_enabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "enabled"/"active"', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getThresholdRuleForAlertTesting(['telemetry']),
          threshold: {
            field: 'keyword',
            value: 1,
          },
        };
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createWebHookRuleAction(supertest);
        await createLegacyRuleAction(supertest, id, hookAction.id);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            threshold: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threshold,
              alerts: 4,
              enabled: 1,
              legacy_notifications_enabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              alerts: 4,
              enabled: 1,
              legacy_notifications_enabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });
    });

    // Note: We don't actually find signals with these tests as we don't have a good way of signal finding with ML rules.
    describe('"ml" rule type', () => {
      it('should show "legacy_notifications_disabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getSimpleMlRule();
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createWebHookRuleAction(supertest);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            machine_learning: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.machine_learning,
              disabled: 1,
              legacy_notifications_disabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              disabled: 1,
              legacy_notifications_disabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_enabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "enabled"/"active"', async () => {
        const rule = getSimpleMlRule('rule-1', true);
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createWebHookRuleAction(supertest);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            machine_learning: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.machine_learning,
              enabled: 1,
              legacy_notifications_enabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              enabled: 1,
              legacy_notifications_enabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });
    });

    describe('"indicator_match/threat_match" rule type', () => {
      it('should show "legacy_notifications_disabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getSimpleThreatMatch();
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createWebHookRuleAction(supertest);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            threat_match: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threat_match,
              disabled: 1,
              legacy_notifications_disabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              disabled: 1,
              legacy_notifications_disabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_enabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "enabled"/"active"', async () => {
        const rule: ThreatMatchRuleCreateProps = {
          ...getSimpleThreatMatch('rule-1', true),
          index: ['telemetry'],
          threat_index: ['telemetry'],
          threat_mapping: [
            {
              entries: [
                {
                  field: 'keyword',
                  value: 'keyword',
                  type: 'mapping',
                },
              ],
            },
          ],
        };
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createWebHookRuleAction(supertest);
        await createLegacyRuleAction(supertest, id, hookAction.id);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: RulesTypeUsage = {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
            threat_match: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threat_match,
              alerts: 4,
              enabled: 1,
              legacy_notifications_enabled: 1,
            },
            custom_total: {
              ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
              alerts: 4,
              enabled: 1,
              legacy_notifications_enabled: 1,
            },
          };
          expect(stats.detection_rules.detection_rule_usage).to.eql(expected);
        });
      });
    });

    describe('"pre-packaged"/"immutable" rules', () => {
      it('should show "legacy_notifications_disabled" to be "1", "has_notification" to be "false, "has_legacy_notification" to be "true" for rule that has at least "1" action(s) and the alert is "disabled"/"in-active"', async () => {
        await installMockPrebuiltRules(supertest, es);
        const immutableRule = await fetchRule(supertest, { ruleId: ELASTIC_SECURITY_RULE_ID });
        const hookAction = await createWebHookRuleAction(supertest);
        const newRuleToUpdate = getSimpleRule(immutableRule.rule_id, false);
        await updateRule(supertest, newRuleToUpdate);
        await createLegacyRuleAction(supertest, immutableRule.id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          // We have to search by "rule_name" since the "rule_id" it is storing is the Saved Object ID and not the rule_id
          const foundRule = stats.detection_rules.detection_rule_detail.find(
            (rule) => rule.rule_id === ELASTIC_SECURITY_RULE_ID
          );
          if (foundRule == null) {
            throw new Error('Found rule should not be null. Please change this end to end test.');
          }
          const {
            created_on: createdOn,
            updated_on: updatedOn,
            rule_id: ruleId,
            rule_version: ruleVersion,
            ...omittedFields
          } = foundRule;
          expect(omittedFields).to.eql({
            rule_name: 'Simple Rule Query',
            rule_type: 'query',
            enabled: false,
            elastic_rule: true,
            alert_count_daily: 0,
            cases_count_total: 0,
            has_notification: false,
            has_legacy_notification: true,
            has_legacy_investigation_field: false,
            has_alert_suppression_per_rule_execution: false,
            has_alert_suppression_per_time_period: false,
            has_alert_suppression_missing_fields_strategy_do_not_suppress: false,
            alert_suppression_fields_count: 0,
          });
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.notifications_disabled
          ).to.eql(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.legacy_notifications_enabled
          ).to.eql(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.legacy_notifications_disabled
          ).to.eql(1);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.notifications_enabled
          ).to.eql(0);
          expect(stats.detection_rules.detection_rule_usage.custom_total).to.eql(
            getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total
          );
        });
      });

      it('should show "legacy_notifications_enabled" to be "1", "has_notification" to be "false, "has_legacy_notification" to be "true" for rule that has at least "1" action(s) and the alert is "enabled"/"active"', async () => {
        await installMockPrebuiltRules(supertest, es);
        const immutableRule = await fetchRule(supertest, { ruleId: ELASTIC_SECURITY_RULE_ID });
        const hookAction = await createWebHookRuleAction(supertest);
        const newRuleToUpdate = getSimpleRule(immutableRule.rule_id, true);
        await updateRule(supertest, newRuleToUpdate);
        await createLegacyRuleAction(supertest, immutableRule.id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          // We have to search by "rule_name" since the "rule_id" it is storing is the Saved Object ID and not the rule_id
          const foundRule = stats.detection_rules.detection_rule_detail.find(
            (rule) => rule.rule_id === ELASTIC_SECURITY_RULE_ID
          );
          if (foundRule == null) {
            throw new Error('Found rule should not be null. Please change this end to end test.');
          }
          const {
            created_on: createdOn,
            updated_on: updatedOn,
            rule_id: ruleId,
            rule_version: ruleVersion,
            ...omittedFields
          } = foundRule;
          expect(omittedFields).to.eql({
            rule_name: 'Simple Rule Query',
            rule_type: 'query',
            enabled: true,
            elastic_rule: true,
            alert_count_daily: 0,
            cases_count_total: 0,
            has_notification: false,
            has_legacy_notification: true,
            has_legacy_investigation_field: false,
            has_alert_suppression_per_rule_execution: false,
            has_alert_suppression_per_time_period: false,
            has_alert_suppression_missing_fields_strategy_do_not_suppress: false,
            alert_suppression_fields_count: 0,
          });
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.notifications_disabled
          ).to.eql(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.legacy_notifications_enabled
          ).to.eql(1);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.legacy_notifications_disabled
          ).to.eql(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.notifications_enabled
          ).to.eql(0);
          expect(stats.detection_rules.detection_rule_usage.custom_total).to.eql(
            getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total
          );
        });
      });
    });
  });
};
