/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { MlJobUsageMetric } from '@kbn/security-solution-plugin/server/usage/detections/ml_jobs/types';
import type { RulesTypeUsage } from '@kbn/security-solution-plugin/server/usage/detections/rules/types';
import type { DetectionMetrics } from '@kbn/security-solution-plugin/server/usage/detections/types';
import type {
  ThreatMatchCreateSchema,
  ThresholdCreateSchema,
} from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { getInitialMlJobUsage } from '@kbn/security-solution-plugin/server/usage/detections/ml_jobs/get_initial_usage';
import { getInitialDetectionMetrics } from '@kbn/security-solution-plugin/server/usage/detections/get_initial_usage';
import {
  getInitialMaxAvgMin,
  getInitialSingleEventLogUsage,
  getInitialSingleEventMetric,
} from '@kbn/security-solution-plugin/server/usage/detections/rules/get_initial_usage';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getEqlRuleForSignalTesting,
  getRuleForSignalTesting,
  getSimpleThreatMatch,
  getStats,
  getThresholdRuleForSignalTesting,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  deleteAllEventLogExecutionEvents,
} from '../../../../utils';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const es = getService('es');

  // Note: We don't actually find signals well with ML tests at the moment so there are not tests for ML rule type for telemetry
  describe('Detection rule status telemetry', async () => {
    before(async () => {
      // Just in case other tests do not clean up the event logs, let us clear them now and here only once.
      await deleteAllEventLogExecutionEvents(es, log);
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    describe('"kql" rule type', () => {
      let stats: DetectionMetrics | undefined;
      before(async () => {
        const rule = getRuleForSignalTesting(['telemetry']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        // get the stats for all the tests where we at least have the expected "query" to reduce chances of flake by checking that at least one custom rule passed
        await retry.try(async () => {
          stats = await getStats(supertest, log);
          expect(stats.detection_rules.detection_rule_status.custom_rules.total.succeeded).to.eql(
            1
          );
        });
      });

      it('should have an empty "ml_jobs"', () => {
        const expectedMLJobs: MlJobUsageMetric = {
          ml_job_usage: getInitialMlJobUsage(),
          ml_job_metrics: [],
        };
        expect(stats?.ml_jobs).to.eql(expectedMLJobs);
      });

      it('should have an empty "detection_rule_detail"', () => {
        expect(stats?.detection_rules.detection_rule_detail).to.eql([]);
      });

      it('should have an active "detection_rule_usage" with non-zero values', () => {
        const expectedRuleUsage: RulesTypeUsage = {
          ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
          query: {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
            enabled: 1,
            alerts: 4,
            notifications_enabled: 0,
            notifications_disabled: 0,
            legacy_notifications_disabled: 0,
            legacy_notifications_enabled: 0,
          },
          custom_total: {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
            enabled: 1,
            alerts: 4,
            notifications_enabled: 0,
            notifications_disabled: 0,
            legacy_notifications_disabled: 0,
            legacy_notifications_enabled: 0,
          },
        };
        expect(stats?.detection_rules.detection_rule_usage).to.eql(expectedRuleUsage);
      });

      it('should have zero values for "detection_rule_status.all_rules" rules that are not query based', () => {
        expect(stats?.detection_rules.detection_rule_status.all_rules.eql).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.machine_learning).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.saved_query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.threat_match).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.threshold).to.eql(
          getInitialSingleEventMetric()
        );
      });

      it('should have zero values for "detection_rule_status.custom_rules" rules that are not query based', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.eql).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.machine_learning).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.saved_query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.threat_match).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.threshold).to.eql(
          getInitialSingleEventMetric()
        );
      });

      it('should have zero values for failures of the query based rule', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.query.failures).to.eql(0);
        expect(stats?.detection_rules.detection_rule_status.custom_rules.query.top_failures).to.eql(
          []
        );
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.partial_failures
        ).to.eql([]);
      });

      it('should have zero values for gaps', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.query.gap_duration).to.eql(
          getInitialMaxAvgMin()
        );
      });

      it('should have non zero values for "index_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.index_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.index_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.index_duration.min
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.search_duration.min
        ).to.be.above(1);
      });

      it('should have non zero values for "search_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.search_duration.min
        ).to.be.above(1);
      });

      it('should have non zero values for "succeeded"', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.query.succeeded).to.eql(1);
      });

      it('should have non zero values for "succeeded", "index_duration", and "search_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.index_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.index_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.index_duration.min
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.query.search_duration.min
        ).to.be.above(1);
      });

      it('should have a total value for "detection_rule_status.custom_rules" rule ', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.total).to.eql({
          failures: 0,
          partial_failures: 0,
          succeeded: 1,
        });
      });

      it('should have zero values for "detection_rule_status.elastic_rules"', async () => {
        expect(stats?.detection_rules.detection_rule_status.elastic_rules).to.eql(
          getInitialSingleEventLogUsage()
        );
      });
    });

    describe('"eql" rule type', () => {
      let stats: DetectionMetrics | undefined;
      before(async () => {
        const rule = getEqlRuleForSignalTesting(['telemetry']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        // get the stats for all the tests where we at least have the expected "query" to reduce chances of flake by checking that at least one custom rule passed
        await retry.try(async () => {
          stats = await getStats(supertest, log);
          expect(stats.detection_rules.detection_rule_status.custom_rules.total.succeeded).to.eql(
            1
          );
        });
      });

      it('should have an empty "ml_jobs"', () => {
        const expectedMLJobs: MlJobUsageMetric = {
          ml_job_usage: getInitialMlJobUsage(),
          ml_job_metrics: [],
        };
        expect(stats?.ml_jobs).to.eql(expectedMLJobs);
      });

      it('should have an empty "detection_rule_detail"', () => {
        expect(stats?.detection_rules.detection_rule_detail).to.eql([]);
      });

      it('should have an active "detection_rule_usage" with non-zero values', () => {
        const expectedRuleUsage: RulesTypeUsage = {
          ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
          eql: {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.eql,
            enabled: 1,
            alerts: 4,
            notifications_enabled: 0,
            notifications_disabled: 0,
            legacy_notifications_disabled: 0,
            legacy_notifications_enabled: 0,
          },
          custom_total: {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
            enabled: 1,
            alerts: 4,
            notifications_enabled: 0,
            notifications_disabled: 0,
            legacy_notifications_disabled: 0,
            legacy_notifications_enabled: 0,
          },
        };
        expect(stats?.detection_rules.detection_rule_usage).to.eql(expectedRuleUsage);
      });

      it('should have zero values for "detection_rule_status.all_rules" rules that are not eql based', () => {
        expect(stats?.detection_rules.detection_rule_status.all_rules.query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.machine_learning).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.saved_query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.threat_match).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.threshold).to.eql(
          getInitialSingleEventMetric()
        );
      });

      it('should have zero values for "detection_rule_status.custom_rules" rules that are not eql based', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.machine_learning).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.saved_query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.threat_match).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.threshold).to.eql(
          getInitialSingleEventMetric()
        );
      });

      it('should have zero values for failures of the eql based rule', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.eql.failures).to.eql(0);
        expect(stats?.detection_rules.detection_rule_status.custom_rules.eql.top_failures).to.eql(
          []
        );
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.partial_failures
        ).to.eql([]);
      });

      it('should have zero values for gaps', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.eql.gap_duration).to.eql(
          getInitialMaxAvgMin()
        );
      });

      it('should have non zero values for "index_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.index_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.index_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.index_duration.min
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.search_duration.min
        ).to.be.above(1);
      });

      it('should have non zero values for "search_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.search_duration.min
        ).to.be.above(1);
      });

      it('should have non zero values for "succeeded"', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.eql.succeeded).to.eql(1);
      });

      it('should have non zero values for "succeeded", "index_duration", and "search_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.index_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.index_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.index_duration.min
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.eql.search_duration.min
        ).to.be.above(1);
      });

      it('should have a total value for "detection_rule_status.custom_rules" rule ', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.total).to.eql({
          failures: 0,
          partial_failures: 0,
          succeeded: 1,
        });
      });

      it('should have zero values for "detection_rule_status.elastic_rules"', async () => {
        expect(stats?.detection_rules.detection_rule_status.elastic_rules).to.eql(
          getInitialSingleEventLogUsage()
        );
      });
    });

    describe('"threshold" rule type', () => {
      let stats: DetectionMetrics | undefined;
      before(async () => {
        const rule: ThresholdCreateSchema = {
          ...getThresholdRuleForSignalTesting(['telemetry']),
          threshold: {
            field: 'keyword',
            value: 1,
          },
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        // get the stats for all the tests where we at least have the expected "query" to reduce chances of flake by checking that at least one custom rule passed
        await retry.try(async () => {
          stats = await getStats(supertest, log);
          expect(stats.detection_rules.detection_rule_status.custom_rules.total.succeeded).to.eql(
            1
          );
        });
      });

      it('should have an empty "ml_jobs"', () => {
        const expectedMLJobs: MlJobUsageMetric = {
          ml_job_usage: getInitialMlJobUsage(),
          ml_job_metrics: [],
        };
        expect(stats?.ml_jobs).to.eql(expectedMLJobs);
      });

      it('should have an empty "detection_rule_detail"', () => {
        expect(stats?.detection_rules.detection_rule_detail).to.eql([]);
      });

      it('should have an active "detection_rule_usage" with non-zero values', () => {
        const expectedRuleUsage: RulesTypeUsage = {
          ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
          threshold: {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threshold,
            enabled: 1,
            alerts: 4,
            notifications_enabled: 0,
            notifications_disabled: 0,
            legacy_notifications_disabled: 0,
            legacy_notifications_enabled: 0,
          },
          custom_total: {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
            enabled: 1,
            alerts: 4,
            notifications_enabled: 0,
            notifications_disabled: 0,
            legacy_notifications_disabled: 0,
            legacy_notifications_enabled: 0,
          },
        };
        expect(stats?.detection_rules.detection_rule_usage).to.eql(expectedRuleUsage);
      });

      it('should have zero values for "detection_rule_status.all_rules" rules that are not threshold based', () => {
        expect(stats?.detection_rules.detection_rule_status.all_rules.query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.machine_learning).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.saved_query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.threat_match).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.eql).to.eql(
          getInitialSingleEventMetric()
        );
      });

      it('should have zero values for "detection_rule_status.custom_rules" rules that are not threshold based', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.machine_learning).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.saved_query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.threat_match).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.eql).to.eql(
          getInitialSingleEventMetric()
        );
      });

      it('should have zero values for failures of the threshold based rule', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.threshold.failures).to.eql(
          0
        );
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.top_failures
        ).to.eql([]);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.partial_failures
        ).to.eql([]);
      });

      it('should have zero values for gaps', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.gap_duration
        ).to.eql(getInitialMaxAvgMin());
      });

      it('should have non zero values for "index_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.index_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.index_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.index_duration.min
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.search_duration.min
        ).to.be.above(1);
      });

      it('should have non zero values for "search_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.search_duration.min
        ).to.be.above(1);
      });

      it('should have non zero values for "succeeded"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.succeeded
        ).to.eql(1);
      });

      it('should have non zero values for "succeeded", "index_duration", and "search_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.index_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.index_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.index_duration.min
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threshold.search_duration.min
        ).to.be.above(1);
      });

      it('should have a total value for "detection_rule_status.custom_rules" rule ', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.total).to.eql({
          failures: 0,
          partial_failures: 0,
          succeeded: 1,
        });
      });

      it('should have zero values for "detection_rule_status.elastic_rules"', async () => {
        expect(stats?.detection_rules.detection_rule_status.elastic_rules).to.eql(
          getInitialSingleEventLogUsage()
        );
      });
    });

    describe('"indicator_match/threat_match" rule type', () => {
      let stats: DetectionMetrics | undefined;
      before(async () => {
        const rule: ThreatMatchCreateSchema = {
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
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        // get the stats for all the tests where we at least have the expected "query" to reduce chances of flake by checking that at least one custom rule passed
        await retry.try(async () => {
          stats = await getStats(supertest, log);
          expect(stats.detection_rules.detection_rule_status.custom_rules.total.succeeded).to.eql(
            1
          );
        });
      });

      it('should have an empty "ml_jobs"', () => {
        const expectedMLJobs: MlJobUsageMetric = {
          ml_job_usage: getInitialMlJobUsage(),
          ml_job_metrics: [],
        };
        expect(stats?.ml_jobs).to.eql(expectedMLJobs);
      });

      it('should have an empty "detection_rule_detail"', () => {
        expect(stats?.detection_rules.detection_rule_detail).to.eql([]);
      });

      it('should have an active "detection_rule_usage" with non-zero values', () => {
        const expectedRuleUsage: RulesTypeUsage = {
          ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
          threat_match: {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threat_match,
            enabled: 1,
            alerts: 4,
            notifications_enabled: 0,
            notifications_disabled: 0,
            legacy_notifications_disabled: 0,
            legacy_notifications_enabled: 0,
          },
          custom_total: {
            ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
            enabled: 1,
            alerts: 4,
            notifications_enabled: 0,
            notifications_disabled: 0,
            legacy_notifications_disabled: 0,
            legacy_notifications_enabled: 0,
          },
        };
        expect(stats?.detection_rules.detection_rule_usage).to.eql(expectedRuleUsage);
      });

      it('should have zero values for "detection_rule_status.all_rules" rules that are not threat_match based', () => {
        expect(stats?.detection_rules.detection_rule_status.all_rules.query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.machine_learning).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.saved_query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.threshold).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.all_rules.eql).to.eql(
          getInitialSingleEventMetric()
        );
      });

      it('should have zero values for "detection_rule_status.custom_rules" rules that are not threat_match based', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.machine_learning).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.saved_query).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.threshold).to.eql(
          getInitialSingleEventMetric()
        );
        expect(stats?.detection_rules.detection_rule_status.custom_rules.eql).to.eql(
          getInitialSingleEventMetric()
        );
      });

      it('should have zero values for failures of the threat_match based rule', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.failures
        ).to.eql(0);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.top_failures
        ).to.eql([]);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.partial_failures
        ).to.eql([]);
      });

      it('should have zero values for gaps', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.gap_duration
        ).to.eql(getInitialMaxAvgMin());
      });

      it('should have non zero values for "index_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.index_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.index_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.index_duration.min
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.search_duration.min
        ).to.be.above(1);
      });

      it('should have non zero values for "search_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.search_duration.min
        ).to.be.above(1);
      });

      it('should have non zero values for "succeeded"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.succeeded
        ).to.eql(1);
      });

      it('should have non zero values for "succeeded", "index_duration", and "search_duration"', () => {
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.index_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.index_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.index_duration.min
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.search_duration.max
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.search_duration.avg
        ).to.be.above(1);
        expect(
          stats?.detection_rules.detection_rule_status.custom_rules.threat_match.search_duration.min
        ).to.be.above(1);
      });

      it('should have a total value for "detection_rule_status.custom_rules" rule ', () => {
        expect(stats?.detection_rules.detection_rule_status.custom_rules.total).to.eql({
          failures: 0,
          partial_failures: 0,
          succeeded: 1,
        });
      });

      it('should have zero values for "detection_rule_status.elastic_rules"', async () => {
        expect(stats?.detection_rules.detection_rule_status.elastic_rules).to.eql(
          getInitialSingleEventLogUsage()
        );
      });
    });
  });
};
