/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DetectionMetrics } from '../../../../../plugins/security_solution/server/usage/detections/types';
import {
  EqlCreateSchema,
  QueryCreateSchema,
  ThreatMatchCreateSchema,
  ThresholdCreateSchema,
} from '../../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getEqlRuleForSignalTesting,
  getRuleForSignalTesting,
  getSimpleMlRule,
  getSimpleThreatMatch,
  getStats,
  getThresholdRuleForSignalTesting,
  installPrePackagedRules,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../../utils';
import { getInitialDetectionMetrics } from '../../../../../plugins/security_solution/server/usage/detections/detection_rule_helpers';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');

  describe('Detection rule telemetry', async () => {
    before(async () => {
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
    });

    it('should have initialized empty/zero values when no rules are running', async () => {
      await retry.try(async () => {
        const stats = await getStats(supertest, log);
        expect(stats).to.eql(getInitialDetectionMetrics());
      });
    });

    describe('"kql" rule type', () => {
      it('should show stats for active rule', async () => {
        const rule: QueryCreateSchema = getRuleForSignalTesting(['telemetry']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                query: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  enabled: 1,
                  alerts: 4,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  enabled: 1,
                  alerts: 4,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show stats for in-active rule', async () => {
        const rule: QueryCreateSchema = getRuleForSignalTesting(['telemetry'], 'rule-1', false);
        await createRule(supertest, log, rule);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                query: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });
    });

    describe('"eql" rule type', () => {
      it('should show stats for active rule', async () => {
        const rule: EqlCreateSchema = getEqlRuleForSignalTesting(['telemetry']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                eql: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  enabled: 1,
                  alerts: 4,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  enabled: 1,
                  alerts: 4,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show stats for in-active rule', async () => {
        const rule: EqlCreateSchema = getEqlRuleForSignalTesting(['telemetry'], 'rule-1', false);
        await createRule(supertest, log, rule);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                eql: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });
    });

    describe('"threshold" rule type', () => {
      it('should show stats for active rule', async () => {
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
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                threshold: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  enabled: 1,
                  alerts: 4,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  enabled: 1,
                  alerts: 4,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show stats for in-active rule', async () => {
        const rule: ThresholdCreateSchema = {
          ...getThresholdRuleForSignalTesting(['telemetry'], 'rule-1', false),
          threshold: {
            field: 'keyword',
            value: 1,
          },
        };
        await createRule(supertest, log, rule);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                threshold: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });
    });

    describe('"ml" rule type', () => {
      // Note: We don't actually find signals with this test as we don't have a good way of signal finding with ML rules.
      it('should show stats for active rule', async () => {
        const rule = getSimpleMlRule('rule-1', true);
        await createRule(supertest, log, rule);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                machine_learning: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  enabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  enabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show stats for in-active rule', async () => {
        const rule = getSimpleMlRule();
        await createRule(supertest, log, rule);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                machine_learning: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });
    });

    describe('"indicator_match/threat_match" rule type', () => {
      it('should show stats for active rule', async () => {
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
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                threat_match: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  enabled: 1,
                  alerts: 4,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  enabled: 1,
                  alerts: 4,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show stats for in-active rule', async () => {
        const rule = getSimpleThreatMatch();
        await createRule(supertest, log, rule);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                threat_match: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });
    });

    describe('"pre-packaged" rules', async () => {
      it('should show stats for totals for in-active pre-packaged rules', async () => {
        await installPrePackagedRules(supertest, log);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          expect(stats.detection_rules.detection_rule_usage.elastic_total.enabled).above(0);
          expect(stats.detection_rules.detection_rule_usage.elastic_total.disabled).above(0);
          expect(stats.detection_rules.detection_rule_usage.elastic_total.enabled).above(0);
          expect(stats.detection_rules.detection_rule_usage.custom_total.enabled).equal(0);
          expect(stats.detection_rules.detection_rule_detail.length).above(0);
        });
      });

      it('should show stats for the detection_rule_details for pre-packaged rules', async () => {
        await installPrePackagedRules(supertest, log);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
          // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint_security.json
          // We have to search by "rule_name" since the "rule_id" it is storing is the Saved Object ID and not the rule_id
          const foundRule = stats.detection_rules.detection_rule_detail.find(
            (rule) => rule.rule_id === '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
          if (foundRule == null) {
            throw new Error('Found rule should not be null');
          }
          const {
            created_on: createdOn,
            updated_on: updatedOn,
            rule_id: ruleId,
            ...omittedFields
          } = foundRule;
          expect(omittedFields).to.eql({
            rule_name: 'Endpoint Security',
            rule_type: 'query',
            rule_version: 3,
            enabled: true,
            elastic_rule: true,
            alert_count_daily: 0,
            cases_count_total: 0,
          });
        });
      });
    });
  });
};
