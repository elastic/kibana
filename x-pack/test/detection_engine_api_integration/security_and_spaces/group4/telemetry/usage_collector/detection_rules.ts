/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DetectionMetrics } from '@kbn/security-solution-plugin/server/usage/detections/types';
import type {
  ThreatMatchCreateSchema,
  ThresholdCreateSchema,
} from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { getInitialDetectionMetrics } from '@kbn/security-solution-plugin/server/usage/detections/get_initial_usage';
import { getInitialEventLogUsage } from '@kbn/security-solution-plugin/server/usage/detections/rules/get_initial_usage';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createLegacyRuleAction,
  createNewAction,
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getEqlRuleForSignalTesting,
  getRule,
  getRuleForSignalTesting,
  getRuleWithWebHookAction,
  getSimpleMlRule,
  getSimpleRule,
  getSimpleThreatMatch,
  getStats,
  getThresholdRuleForSignalTesting,
  installPrePackagedRules,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  updateRule,
  deleteAllEventLogExecutionEvents,
} from '../../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const es = getService('es');

  describe('Detection rule telemetry', async () => {
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
      it('should show "notifications_enabled", "notifications_disabled" "legacy_notifications_enabled", "legacy_notifications_disabled", all to be "0" for "disabled"/"in-active" rule that does not have any actions', async () => {
        const rule = getRuleForSignalTesting(['telemetry'], 'rule-1', false);
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
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_enabled", "notifications_disabled" "legacy_notifications_enabled", "legacy_notifications_disabled", all to be "0" for "enabled"/"active" rule that does not have any actions', async () => {
        const rule = getRuleForSignalTesting(['telemetry']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial (see detection_rule_status.ts for more in-depth testing of this structure)
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_disabled" to be "1" for rule that has at least "1" action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getRuleForSignalTesting(['telemetry']);
        const hookAction = await createNewAction(supertest, log);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, false, rule);
        await createRule(supertest, log, ruleToCreate);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial (see detection_rule_status.ts for more in-depth testing of this structure)
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                query: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.query,
                  notifications_disabled: 1,
                  disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  notifications_disabled: 1,
                  disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_enabled" to be "1" for rule that has at least "1" action(s) and the alert is "enabled"/"active"', async () => {
        const rule = getRuleForSignalTesting(['telemetry']);
        const hookAction = await createNewAction(supertest, log);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, true, rule);
        const { id } = await createRule(supertest, log, ruleToCreate);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

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
                  notifications_enabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  enabled: 1,
                  alerts: 4,
                  notifications_enabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_disabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getRuleForSignalTesting(['telemetry'], 'rule-1', false);
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createNewAction(supertest, log);
        await createLegacyRuleAction(supertest, id, hookAction.id);

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
                  legacy_notifications_disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                  legacy_notifications_disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_enabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "enabled"/"active"', async () => {
        const rule = getRuleForSignalTesting(['telemetry']);
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createNewAction(supertest, log);
        await createLegacyRuleAction(supertest, id, hookAction.id);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial (see detection_rule_status.ts for more in-depth testing of this structure)
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });
    });

    describe('"eql" rule type', () => {
      it('should show "notifications_enabled", "notifications_disabled" "legacy_notifications_enabled", "legacy_notifications_disabled", all to be "0" for "disabled"/"in-active" rule that does not have any actions', async () => {
        const rule = getEqlRuleForSignalTesting(['telemetry'], 'rule-1', false);
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
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.eql,
                  disabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_enabled", "notifications_disabled" "legacy_notifications_enabled", "legacy_notifications_disabled", all to be "0" for "enabled"/"active" rule that does not have any actions', async () => {
        const rule = getEqlRuleForSignalTesting(['telemetry']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial (see detection_rule_status.ts for more in-depth testing of this structure)
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_disabled" to be "1" for rule that has at least "1" action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getEqlRuleForSignalTesting(['telemetry']);
        const hookAction = await createNewAction(supertest, log);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, false, rule);
        await createRule(supertest, log, ruleToCreate);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial (see detection_rule_status.ts for more in-depth testing of this structure)
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                eql: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.eql,
                  notifications_disabled: 1,
                  disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  notifications_disabled: 1,
                  disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_enabled" to be "1" for rule that has at least "1" action(s) and the alert is "enabled"/"active"', async () => {
        const rule = getEqlRuleForSignalTesting(['telemetry']);
        const hookAction = await createNewAction(supertest, log);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, true, rule);
        const { id } = await createRule(supertest, log, ruleToCreate);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial (see detection_rule_status.ts for more in-depth testing of this structure)
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                eql: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.eql,
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_disabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getEqlRuleForSignalTesting(['telemetry'], 'rule-1', false);
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createNewAction(supertest, log);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_enabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "enabled"/"active"', async () => {
        const rule = getEqlRuleForSignalTesting(['telemetry']);
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createNewAction(supertest, log);
        await createLegacyRuleAction(supertest, id, hookAction.id);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial (see detection_rule_status.ts for more in-depth testing of this structure)
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });
    });

    describe('"threshold" rule type', () => {
      it('should show "notifications_enabled", "notifications_disabled" "legacy_notifications_enabled", "legacy_notifications_disabled", all to be "0" for "disabled"/"in-active" rule that does not have any actions', async () => {
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
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threshold,
                  disabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_enabled", "notifications_disabled" "legacy_notifications_enabled", "legacy_notifications_disabled", all to be "0" for "enabled"/"active" rule that does not have any actions', async () => {
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

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_disabled" to be "1" for rule that has at least "1" action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule: ThresholdCreateSchema = {
          ...getThresholdRuleForSignalTesting(['telemetry'], 'rule-1', false),
          threshold: {
            field: 'keyword',
            value: 1,
          },
        };
        const hookAction = await createNewAction(supertest, log);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, false, rule);
        await createRule(supertest, log, ruleToCreate);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                threshold: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threshold,
                  notifications_disabled: 1,
                  disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  notifications_disabled: 1,
                  disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_enabled" to be "1" for rule that has at least "1" action(s) and the alert is "enabled"/"active"', async () => {
        const rule: ThresholdCreateSchema = {
          ...getThresholdRuleForSignalTesting(['telemetry']),
          threshold: {
            field: 'keyword',
            value: 1,
          },
        };
        const hookAction = await createNewAction(supertest, log);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, true, rule);
        const { id } = await createRule(supertest, log, ruleToCreate);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                threshold: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threshold,
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_disabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule: ThresholdCreateSchema = {
          ...getThresholdRuleForSignalTesting(['telemetry'], 'rule-1', false),
          threshold: {
            field: 'keyword',
            value: 1,
          },
        };
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createNewAction(supertest, log);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_enabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "enabled"/"active"', async () => {
        const rule: ThresholdCreateSchema = {
          ...getThresholdRuleForSignalTesting(['telemetry']),
          threshold: {
            field: 'keyword',
            value: 1,
          },
        };
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createNewAction(supertest, log);
        await createLegacyRuleAction(supertest, id, hookAction.id);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });
    });

    // Note: We don't actually find signals with these tests as we don't have a good way of signal finding with ML rules.
    describe('"ml" rule type', () => {
      it('should show "notifications_enabled", "notifications_disabled" "legacy_notifications_enabled", "legacy_notifications_disabled", all to be "0" for "disabled"/"in-active" rule that does not have any actions', async () => {
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
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage
                    .machine_learning,
                  disabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_enabled", "notifications_disabled" "legacy_notifications_enabled", "legacy_notifications_disabled", all to be "0" for "enabled"/"active" rule that does not have any actions', async () => {
        const rule = getSimpleMlRule('rule-1', true);
        await createRule(supertest, log, rule);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                machine_learning: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage
                    .machine_learning,
                  enabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  enabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_disabled" to be "1" for rule that has at least "1" action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getSimpleMlRule();
        const hookAction = await createNewAction(supertest, log);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, false, rule);
        await createRule(supertest, log, ruleToCreate);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                machine_learning: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage
                    .machine_learning,
                  notifications_disabled: 1,
                  disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  notifications_disabled: 1,
                  disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_enabled" to be "1" for rule that has at least "1" action(s) and the alert is "enabled"/"active"', async () => {
        const rule = getSimpleMlRule('rule-1', true);
        const hookAction = await createNewAction(supertest, log);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, true, rule);
        await createRule(supertest, log, ruleToCreate);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                machine_learning: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage
                    .machine_learning,
                  enabled: 1,
                  notifications_enabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  enabled: 1,
                  notifications_enabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_disabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getSimpleMlRule();
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createNewAction(supertest, log);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                machine_learning: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage
                    .machine_learning,
                  disabled: 1,
                  legacy_notifications_disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                  legacy_notifications_disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_enabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "enabled"/"active"', async () => {
        const rule = getSimpleMlRule('rule-1', true);
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createNewAction(supertest, log);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                machine_learning: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage
                    .machine_learning,
                  enabled: 1,
                  legacy_notifications_enabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  enabled: 1,
                  legacy_notifications_enabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });
    });

    describe('"indicator_match/threat_match" rule type', () => {
      it('should show "notifications_enabled", "notifications_disabled" "legacy_notifications_enabled", "legacy_notifications_disabled", all to be "0" for "disabled"/"in-active" rule that does not have any actions', async () => {
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
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threat_match,
                  disabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  disabled: 1,
                  notifications_enabled: 0,
                  notifications_disabled: 0,
                  legacy_notifications_disabled: 0,
                  legacy_notifications_enabled: 0,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_enabled", "notifications_disabled" "legacy_notifications_enabled", "legacy_notifications_disabled", all to be "0" for "enabled"/"active" rule that does not have any actions', async () => {
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

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_disabled" to be "1" for rule that has at least "1" action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getSimpleThreatMatch();
        const hookAction = await createNewAction(supertest, log);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, false, rule);
        await createRule(supertest, log, ruleToCreate);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                threat_match: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threat_match,
                  notifications_disabled: 1,
                  disabled: 1,
                },
                custom_total: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total,
                  notifications_disabled: 1,
                  disabled: 1,
                },
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "notifications_enabled" to be "1" for rule that has at least "1" action(s) and the alert is "enabled"/"active"', async () => {
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
        const hookAction = await createNewAction(supertest, log);
        const ruleToCreate = getRuleWithWebHookAction(hookAction.id, true, rule);
        const { id } = await createRule(supertest, log, ruleToCreate);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
                ...getInitialDetectionMetrics().detection_rules.detection_rule_usage,
                threat_match: {
                  ...getInitialDetectionMetrics().detection_rules.detection_rule_usage.threat_match,
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_disabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "disabled"/"in-active"', async () => {
        const rule = getSimpleThreatMatch();
        const { id } = await createRule(supertest, log, rule);
        const hookAction = await createNewAction(supertest, log);
        await createLegacyRuleAction(supertest, id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });

      it('should show "legacy_notifications_enabled" to be "1" for rule that has at least "1" legacy action(s) and the alert is "enabled"/"active"', async () => {
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
        const hookAction = await createNewAction(supertest, log);
        await createLegacyRuleAction(supertest, id, hookAction.id);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);

          // remove "detection_rule_status" from the test by resetting it to initial
          stats.detection_rules.detection_rule_status = getInitialEventLogUsage();

          const expected: DetectionMetrics = {
            ...getInitialDetectionMetrics(),
            detection_rules: {
              ...getInitialDetectionMetrics().detection_rules,
              detection_rule_usage: {
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
              },
            },
          };
          expect(stats).to.eql(expected);
        });
      });
    });

    describe('"pre-packaged"/"immutable" rules', async () => {
      it('should show stats for totals for in-active pre-packaged rules', async () => {
        await installPrePackagedRules(supertest, log);
        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          expect(stats.detection_rules.detection_rule_usage.elastic_total.enabled).above(0);
          expect(stats.detection_rules.detection_rule_usage.elastic_total.disabled).above(0);
          expect(stats.detection_rules.detection_rule_usage.elastic_total.enabled).above(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.legacy_notifications_enabled
          ).to.eql(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.legacy_notifications_disabled
          ).to.eql(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.notifications_enabled
          ).to.eql(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.notifications_disabled
          ).to.eql(0);
          expect(stats.detection_rules.detection_rule_detail.length).above(0);
          expect(stats.detection_rules.detection_rule_usage.custom_total).to.eql({
            enabled: 0,
            disabled: 0,
            alerts: 0,
            cases: 0,
            legacy_notifications_enabled: 0,
            legacy_notifications_disabled: 0,
            notifications_enabled: 0,
            notifications_disabled: 0,
          });
        });
      });

      it('should show stats for the detection_rule_details for a specific pre-packaged rule', async () => {
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
            throw new Error('Found rule should not be null. Please change this end to end test.');
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
            has_notification: false,
            has_legacy_notification: false,
          });
        });
      });

      it('should show "notifications_disabled" to be "1", "has_notification" to be "true, "has_legacy_notification" to be "false" for rule that has at least "1" action(s) and the alert is "disabled"/"in-active"', async () => {
        await installPrePackagedRules(supertest, log);
        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint_security.json
        const immutableRule = await getRule(supertest, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        const hookAction = await createNewAction(supertest, log);
        const newRuleToUpdate = getSimpleRule(immutableRule.rule_id);
        const ruleToUpdate = getRuleWithWebHookAction(hookAction.id, false, newRuleToUpdate);
        await updateRule(supertest, log, ruleToUpdate);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          // We have to search by "rule_name" since the "rule_id" it is storing is the Saved Object ID and not the rule_id
          const foundRule = stats.detection_rules.detection_rule_detail.find(
            (rule) => rule.rule_id === '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
          if (foundRule == null) {
            throw new Error('Found rule should not be null. Please change this end to end test.');
          }
          const {
            created_on: createdOn,
            updated_on: updatedOn,
            rule_id: ruleId,
            ...omittedFields
          } = foundRule;
          expect(omittedFields).to.eql({
            rule_name: 'Simple Rule Query',
            rule_type: 'query',
            rule_version: 3,
            enabled: false,
            elastic_rule: true,
            alert_count_daily: 0,
            cases_count_total: 0,
            has_notification: true,
            has_legacy_notification: false,
          });
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.notifications_disabled
          ).to.eql(1);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.legacy_notifications_enabled
          ).to.eql(0);
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

      it('should show "notifications_enabled" to be "1", "has_notification" to be "true, "has_legacy_notification" to be "false" for rule that has at least "1" action(s) and the alert is "enabled"/"active"', async () => {
        await installPrePackagedRules(supertest, log);
        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint_security.json
        const immutableRule = await getRule(supertest, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        const hookAction = await createNewAction(supertest, log);
        const newRuleToUpdate = getSimpleRule(immutableRule.rule_id);
        const ruleToUpdate = getRuleWithWebHookAction(hookAction.id, true, newRuleToUpdate);
        await updateRule(supertest, log, ruleToUpdate);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          // We have to search by "rule_name" since the "rule_id" it is storing is the Saved Object ID and not the rule_id
          const foundRule = stats.detection_rules.detection_rule_detail.find(
            (rule) => rule.rule_id === '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
          if (foundRule == null) {
            throw new Error('Found rule should not be null. Please change this end to end test.');
          }
          const {
            created_on: createdOn,
            updated_on: updatedOn,
            rule_id: ruleId,
            ...omittedFields
          } = foundRule;
          expect(omittedFields).to.eql({
            rule_name: 'Simple Rule Query',
            rule_type: 'query',
            rule_version: 3,
            enabled: true,
            elastic_rule: true,
            alert_count_daily: 0,
            cases_count_total: 0,
            has_notification: true,
            has_legacy_notification: false,
          });
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.notifications_disabled
          ).to.eql(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.legacy_notifications_enabled
          ).to.eql(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.legacy_notifications_disabled
          ).to.eql(0);
          expect(
            stats.detection_rules.detection_rule_usage.elastic_total.notifications_enabled
          ).to.eql(1);
          expect(stats.detection_rules.detection_rule_usage.custom_total).to.eql(
            getInitialDetectionMetrics().detection_rules.detection_rule_usage.custom_total
          );
        });
      });

      it('should show "legacy_notifications_disabled" to be "1", "has_notification" to be "false, "has_legacy_notification" to be "true" for rule that has at least "1" action(s) and the alert is "disabled"/"in-active"', async () => {
        await installPrePackagedRules(supertest, log);
        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint_security.json
        const immutableRule = await getRule(supertest, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        const hookAction = await createNewAction(supertest, log);
        const newRuleToUpdate = getSimpleRule(immutableRule.rule_id, false);
        await updateRule(supertest, log, newRuleToUpdate);
        await createLegacyRuleAction(supertest, immutableRule.id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          // We have to search by "rule_name" since the "rule_id" it is storing is the Saved Object ID and not the rule_id
          const foundRule = stats.detection_rules.detection_rule_detail.find(
            (rule) => rule.rule_id === '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
          if (foundRule == null) {
            throw new Error('Found rule should not be null. Please change this end to end test.');
          }
          const {
            created_on: createdOn,
            updated_on: updatedOn,
            rule_id: ruleId,
            ...omittedFields
          } = foundRule;
          expect(omittedFields).to.eql({
            rule_name: 'Simple Rule Query',
            rule_type: 'query',
            rule_version: 3,
            enabled: false,
            elastic_rule: true,
            alert_count_daily: 0,
            cases_count_total: 0,
            has_notification: false,
            has_legacy_notification: true,
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
        await installPrePackagedRules(supertest, log);
        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint_security.json
        const immutableRule = await getRule(supertest, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        const hookAction = await createNewAction(supertest, log);
        const newRuleToUpdate = getSimpleRule(immutableRule.rule_id, true);
        await updateRule(supertest, log, newRuleToUpdate);
        await createLegacyRuleAction(supertest, immutableRule.id, hookAction.id);

        await retry.try(async () => {
          const stats = await getStats(supertest, log);
          // We have to search by "rule_name" since the "rule_id" it is storing is the Saved Object ID and not the rule_id
          const foundRule = stats.detection_rules.detection_rule_detail.find(
            (rule) => rule.rule_id === '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
          if (foundRule == null) {
            throw new Error('Found rule should not be null. Please change this end to end test.');
          }
          const {
            created_on: createdOn,
            updated_on: updatedOn,
            rule_id: ruleId,
            ...omittedFields
          } = foundRule;
          expect(omittedFields).to.eql({
            rule_name: 'Simple Rule Query',
            rule_type: 'query',
            rule_version: 3,
            enabled: true,
            elastic_rule: true,
            alert_count_daily: 0,
            cases_count_total: 0,
            has_notification: false,
            has_legacy_notification: true,
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
