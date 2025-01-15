/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import {
  executeAlert,
  executeRatioAlert,
  LogThresholdAlertReporter,
} from '@kbn/infra-plugin/server/lib/alerting/log_threshold/log_threshold_executor';
import {
  Comparator,
  TimeUnit,
  RatioCriteria,
  RuleParams,
} from '@kbn/infra-plugin/common/alerting/logs/log_threshold/types';
import { DATES } from './utils/constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');
  describe('Log Threshold Rule', () => {
    describe('executeAlert', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/alerts_test_data'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts_test_data'));

      describe('without group by', () => {
        it('should trigger alerts below the alert limit', async () => {
          const timestamp = new Date(DATES['alert-test-data'].gauge.max);
          const alertReporter = sinon.fake() as SinonSpyOf<LogThresholdAlertReporter>;
          const alertsClient = {
            report: sinon.fake(),
            getAlertLimitValue: sinon.fake.returns(10),
            setAlertLimitReached: sinon.fake(),
            getRecoveredAlerts: sinon.fake(),
            setAlertData: sinon.fake(),
            isTrackedAlert: sinon.fake(),
          };
          const ruleParams: RuleParams = {
            logView: {
              logViewId: 'Default',
              type: 'log-view-reference',
            },
            count: {
              comparator: Comparator.GT_OR_EQ,
              value: 1,
            },
            timeUnit: 'm' as TimeUnit,
            timeSize: 5,
            criteria: [
              {
                field: 'env',
                comparator: Comparator.NOT_EQ,
                value: 'dev',
              },
            ],
          };

          await executeAlert(
            ruleParams,
            '@timestamp',
            'alerts-test-data',
            {},
            esClient,
            alertReporter,
            alertsClient,
            timestamp.valueOf()
          );

          expect(alertReporter.callCount).to.equal(1);
          expect(alertReporter.getCall(0).args).to.eql([
            '*',
            '2 log entries in the last 5 mins. Alert when ≥ 1.',
            2,
            1,
            [
              {
                actionGroup: 'logs.threshold.fired',
                context: {
                  conditions: 'env does not equal dev',
                  group: null,
                  isRatio: false,
                  matchingDocuments: 2,
                  reason: '2 log entries in the last 5 mins. Alert when ≥ 1.',
                },
              },
            ],
            undefined,
          ]);
          expect(alertsClient.setAlertLimitReached.calledOnceWith(false)).to.be(true);
        });
      });

      describe('with group by', () => {
        it('should trigger alerts up to the alert limit when group by env', async () => {
          const timestamp = new Date(DATES['alert-test-data'].gauge.max);
          const alertReporter = sinon.fake() as SinonSpyOf<LogThresholdAlertReporter>;
          const alertsClient = {
            report: sinon.fake(),
            getAlertLimitValue: sinon.fake.returns(2),
            setAlertLimitReached: sinon.fake(),
            getRecoveredAlerts: sinon.fake(),
            setAlertData: sinon.fake(),
            isTrackedAlert: sinon.fake(),
          };
          const ruleParams: RuleParams = {
            logView: {
              logViewId: 'Default',
              type: 'log-view-reference',
            },
            count: {
              comparator: Comparator.GT_OR_EQ,
              value: 1,
            },
            timeUnit: 'm' as TimeUnit,
            timeSize: 5,
            groupBy: ['env'],
            criteria: [
              {
                field: 'env',
                comparator: Comparator.NOT_EQ,
                value: 'test',
              },
            ],
          };

          await executeAlert(
            ruleParams,
            '@timestamp',
            'alerts-test-data',
            {},
            esClient,
            alertReporter,
            alertsClient,
            timestamp.valueOf()
          );

          expect(alertReporter.callCount).to.equal(2);
          expect(alertReporter.getCall(0).args).to.eql([
            'dev',
            '3 log entries in the last 5 mins for dev. Alert when ≥ 1.',
            3,
            1,
            [
              {
                actionGroup: 'logs.threshold.fired',
                context: {
                  conditions: 'env does not equal test',
                  group: 'dev',
                  groupByKeys: {
                    env: 'dev',
                  },
                  isRatio: false,
                  matchingDocuments: 3,
                  reason: '3 log entries in the last 5 mins for dev. Alert when ≥ 1.',
                },
              },
            ],
            undefined,
          ]);
          expect(alertsClient.setAlertLimitReached.calledOnceWith(true)).to.be(true);
        });

        it('should trigger alerts up to the alert limit when group by host.name', async () => {
          const timestamp = new Date(DATES['alert-test-data'].gauge.max);
          const alertReporter = sinon.fake() as SinonSpyOf<LogThresholdAlertReporter>;
          const alertsClient = {
            report: sinon.fake(),
            getAlertLimitValue: sinon.fake.returns(1),
            setAlertLimitReached: sinon.fake(),
            getRecoveredAlerts: sinon.fake(),
            setAlertData: sinon.fake(),
            isTrackedAlert: sinon.fake(),
          };
          const ruleParams: RuleParams = {
            logView: {
              logViewId: 'Default',
              type: 'log-view-reference',
            },
            count: {
              comparator: Comparator.GT_OR_EQ,
              value: 1,
            },
            timeUnit: 'm' as TimeUnit,
            timeSize: 5,
            groupBy: ['host.name'],
            criteria: [
              {
                field: 'env',
                comparator: Comparator.NOT_EQ,
                value: 'test',
              },
            ],
          };

          await executeAlert(
            ruleParams,
            '@timestamp',
            'alerts-test-data',
            {},
            esClient,
            alertReporter,
            alertsClient,
            timestamp.valueOf()
          );

          expect(alertReporter.callCount).to.equal(1);
          expect(alertReporter.getCall(0).args).to.eql([
            'host-01',
            '1 log entry in the last 5 mins for host-01. Alert when ≥ 1.',
            1,
            1,
            [
              {
                actionGroup: 'logs.threshold.fired',
                context: {
                  conditions: 'env does not equal test',
                  group: 'host-01',
                  groupByKeys: {
                    host: {
                      name: 'host-01',
                    },
                  },
                  isRatio: false,
                  matchingDocuments: 1,
                  reason: '1 log entry in the last 5 mins for host-01. Alert when ≥ 1.',
                  host: {
                    name: 'host-01',
                  },
                },
              },
            ],
            {
              host: {
                name: 'host-01',
              },
            },
          ]);
          expect(alertsClient.setAlertLimitReached.calledOnceWith(true)).to.be(true);
        });

        it('alert context should not have excluded fields when group by host.name', async () => {
          const timestamp = new Date(DATES['alert-test-data'].gauge.max);
          const alertReporter = sinon.fake() as SinonSpyOf<LogThresholdAlertReporter>;
          const alertsClient = {
            report: sinon.fake(),
            getAlertLimitValue: sinon.fake.returns(1),
            setAlertLimitReached: sinon.fake(),
            getRecoveredAlerts: sinon.fake(),
            setAlertData: sinon.fake(),
            isTrackedAlert: sinon.fake(),
          };
          const ruleParams: RuleParams = {
            logView: {
              logViewId: 'Default',
              type: 'log-view-reference',
            },
            count: {
              comparator: Comparator.GT_OR_EQ,
              value: 1,
            },
            timeUnit: 'm' as TimeUnit,
            timeSize: 5,
            groupBy: ['host.name'],
            criteria: [
              {
                field: 'env',
                comparator: Comparator.NOT_EQ,
                value: 'test',
              },
            ],
          };

          await executeAlert(
            ruleParams,
            '@timestamp',
            'alerts-test-data',
            {},
            esClient,
            alertReporter,
            alertsClient,
            timestamp.valueOf()
          );

          expect(alertReporter.callCount).to.equal(1);
          expect(alertReporter.getCall(0).args[5]?.host).not.have.property('disk');
          expect(alertReporter.getCall(0).args[5]?.host).not.have.property('network');
          expect(alertReporter.getCall(0).args[5]?.host).not.have.property('cpu');
        });

        it('should limit alerts to the alert limit', async () => {
          const timestamp = new Date(DATES['alert-test-data'].gauge.max);
          const alertReporter = sinon.fake() as SinonSpyOf<LogThresholdAlertReporter>;
          const alertsClient = {
            report: sinon.fake(),
            getAlertLimitValue: sinon.fake.returns(1),
            setAlertLimitReached: sinon.fake(),
            getRecoveredAlerts: sinon.fake(),
            setAlertData: sinon.fake(),
            isTrackedAlert: sinon.fake(),
          };
          const ruleParams: RuleParams = {
            logView: {
              logViewId: 'Default',
              type: 'log-view-reference',
            },
            count: {
              comparator: Comparator.GT_OR_EQ,
              value: 1,
            },
            timeUnit: 'm' as TimeUnit,
            timeSize: 5,
            groupBy: ['env'],
            criteria: [
              {
                field: 'env',
                comparator: Comparator.NOT_EQ,
                value: 'test',
              },
            ],
          };

          await executeAlert(
            ruleParams,
            '@timestamp',
            'alerts-test-data',
            {},
            esClient,
            alertReporter,
            alertsClient,
            timestamp.valueOf()
          );

          expect(alertReporter.callCount).to.equal(1);
          expect(alertReporter.getCall(0).args).to.eql([
            'dev',
            '3 log entries in the last 5 mins for dev. Alert when ≥ 1.',
            3,
            1,
            [
              {
                actionGroup: 'logs.threshold.fired',
                context: {
                  conditions: 'env does not equal test',
                  group: 'dev',
                  groupByKeys: {
                    env: 'dev',
                  },
                  isRatio: false,
                  matchingDocuments: 3,
                  reason: '3 log entries in the last 5 mins for dev. Alert when ≥ 1.',
                },
              },
            ],
            undefined,
          ]);
          expect(alertsClient.setAlertLimitReached.calledOnceWith(true)).to.be(true);
        });
      });
    });

    describe('executeRatioAlert', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/ten_thousand_plus'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/ten_thousand_plus'));

      describe('without group by', () => {
        it('should trigger alerts below the alert limit', async () => {
          const timestamp = new Date(DATES.ten_thousand_plus.max);
          const alertReporter = sinon.fake() as SinonSpyOf<LogThresholdAlertReporter>;
          const alertsClient = {
            report: sinon.fake(),
            getAlertLimitValue: sinon.fake.returns(2),
            setAlertLimitReached: sinon.fake(),
            getRecoveredAlerts: sinon.fake(),
            setAlertData: sinon.fake(),
            isTrackedAlert: sinon.fake(),
          };
          const ruleParams: RuleParams = {
            logView: {
              logViewId: 'Default',
              type: 'log-view-reference',
            },
            count: {
              comparator: Comparator.GT_OR_EQ,
              value: 0.5,
            },
            timeUnit: 'm' as TimeUnit,
            timeSize: 5,
            criteria: [
              [{ field: 'event.dataset', comparator: Comparator.EQ, value: 'nginx.error' }],
              [{ field: 'event.dataset', comparator: Comparator.NOT_EQ, value: 'nginx.error' }],
            ] as RatioCriteria,
          };

          await executeRatioAlert(
            ruleParams,
            '@timestamp',
            'filebeat-*',
            {},
            esClient,
            alertReporter,
            alertsClient,
            timestamp.valueOf()
          );
          expect(alertReporter.callCount).to.equal(1);
          expect(alertReporter.getCall(0).args).to.eql([
            '*',
            'The ratio of selected logs is 0.5526081141328578 in the last 5 mins. Alert when ≥ 0.5.',
            0.5526081141328578,
            0.5,
            [
              {
                actionGroup: 'logs.threshold.fired',
                context: {
                  denominatorConditions: 'event.dataset does not equal nginx.error',
                  group: null,
                  isRatio: true,
                  numeratorConditions: 'event.dataset equals nginx.error',
                  ratio: 0.5526081141328578,
                  reason:
                    'The ratio of selected logs is 0.5526081141328578 in the last 5 mins. Alert when ≥ 0.5.',
                },
              },
            ],
            undefined,
          ]);
          expect(alertsClient.setAlertLimitReached.calledOnceWith(false)).to.be(true);
        });
      });

      describe('with group by', () => {
        it('should trigger alerts below the alert limit', async () => {
          const timestamp = new Date(DATES.ten_thousand_plus.max);
          const alertReporter = sinon.fake() as SinonSpyOf<LogThresholdAlertReporter>;
          const alertsClient = {
            report: sinon.fake(),
            getAlertLimitValue: sinon.fake.returns(2),
            setAlertLimitReached: sinon.fake(),
            getRecoveredAlerts: sinon.fake(),
            setAlertData: sinon.fake(),
            isTrackedAlert: sinon.fake(),
          };
          const ruleParams: RuleParams = {
            logView: {
              logViewId: 'Default',
              type: 'log-view-reference',
            },
            count: {
              comparator: Comparator.GT_OR_EQ,
              value: 0.5,
            },
            timeUnit: 'm' as TimeUnit,
            timeSize: 5,
            groupBy: ['event.category'],
            criteria: [
              [{ field: 'event.dataset', comparator: Comparator.EQ, value: 'nginx.error' }],
              [{ field: 'event.dataset', comparator: Comparator.NOT_EQ, value: 'nginx.error' }],
            ] as RatioCriteria,
          };

          await executeRatioAlert(
            ruleParams,
            '@timestamp',
            'filebeat-*',
            {},
            esClient,
            alertReporter,
            alertsClient,
            timestamp.valueOf()
          );
          expect(alertReporter.callCount).to.equal(1);
          expect(alertReporter.getCall(0).args).to.eql([
            'web',
            'The ratio of selected logs is 0.5526081141328578 in the last 5 mins for web. Alert when ≥ 0.5.',
            0.5526081141328578,
            0.5,
            [
              {
                actionGroup: 'logs.threshold.fired',
                context: {
                  denominatorConditions: 'event.dataset does not equal nginx.error',
                  group: 'web',
                  groupByKeys: {
                    event: {
                      category: 'web',
                    },
                  },
                  isRatio: true,
                  numeratorConditions: 'event.dataset equals nginx.error',
                  ratio: 0.5526081141328578,
                  reason:
                    'The ratio of selected logs is 0.5526081141328578 in the last 5 mins for web. Alert when ≥ 0.5.',
                },
              },
            ],
            undefined,
          ]);
          expect(alertsClient.setAlertLimitReached.calledOnceWith(false)).to.be(true);
        });
      });
    });
  });
}

type SinonSpyOf<SpyTarget extends (...args: any[]) => any> = sinon.SinonSpy<
  Parameters<SpyTarget>,
  ReturnType<SpyTarget>
>;
