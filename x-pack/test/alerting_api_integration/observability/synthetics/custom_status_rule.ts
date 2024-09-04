/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import moment from 'moment';
import { StatusRuleParams } from '@kbn/synthetics-plugin/common/rules/status_rule';
import {
  getReasonMessage,
  getUngroupedReasonMessage,
} from '@kbn/synthetics-plugin/server/alert_rules/status_rule/message_utils';
import { AlertStatusMetaDataCodec } from '@kbn/synthetics-plugin/server/alert_rules/status_rule/queries/query_monitor_status_alert';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { SyntheticsRuleHelper } from './synthetics_rule_helper';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const server = getService('kibanaServer');
  const retryService = getService('retry');
  const ruleHelper = new SyntheticsRuleHelper(getService);

  describe('SyntheticsCustomStatusRule', () => {
    before(async () => {
      await server.savedObjects.cleanStandardList();
    });

    after(async () => {
      await server.savedObjects.cleanStandardList();
    });

    describe('NumberOfChecks', () => {
      let ruleId = '';
      const params = {
        condition: {
          locationsThreshold: 1,
          window: {
            numberOfChecks: 5,
          },
          groupBy: 'locationId',
          downThreshold: 5,
        },
      };

      it('creates a custom rule', async () => {
        const rule = await ruleHelper.createCustomStatusRule({
          params,
          name: 'When down 5 times from 1 location',
        });
        ruleId = rule.id;
        expect(rule.params).to.eql(params);
      });

      let monitor: any;
      let docs: any[] = [];

      it('creates a monitor', async () => {
        monitor = await ruleHelper.addMonitor('Monitor check based at ' + moment().format('LT'));
        expect(monitor).to.have.property('id');

        docs = await ruleHelper.makeSummaries({
          monitor,
          downChecks: 5,
        });
      });

      it('should trigger down alert', async function () {
        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
        });

        const reasonMessage = getReasonMessage({
          name: monitor.name,
          location: 'Dev Service',
          timestamp: moment(docs[4]['@timestamp']).format('LLL'),
          status: 'down',
          numberOfChecks: 5,
          downThreshold: 5,
          locationsThreshold: 1,
          checks: {
            downWithinXChecks: 5,
            down: 5,
          },
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(reasonMessage);
      });

      it('should trigger recovered alert', async function () {
        docs = await ruleHelper.makeSummaries({
          monitor,
          upChecks: 1,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [{ term: { 'kibana.alert.status': 'recovered' } }],
        });

        const alert = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'recovered');
      });

      it('should trigger down for ungrouped', async () => {
        params.condition.groupBy = 'none';
        const rule = await ruleHelper.createCustomStatusRule({
          params,
          name: 'Status based on number of checks',
        });
        ruleId = rule.id;
        expect(rule.params).to.eql(params);

        monitor = await ruleHelper.addMonitor('Monitor for grouped ' + moment().format('LT'));
        expect(monitor).to.have.property('id');

        docs = await ruleHelper.makeSummaries({
          monitor,
          downChecks: 5,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" is down from Dev Service. Alert when down 5 times from at least 1 location.`
        );

        await ruleHelper.deleteMonitor(monitor.id);
      });
    });

    describe('NumberOfLocations', () => {
      let ruleId = '';
      let params: StatusRuleParams = {
        condition: {
          locationsThreshold: 2,
          window: {
            numberOfChecks: 1,
          },
          groupBy: 'locationId',
          downThreshold: 1,
        },
      };
      it('creates a custom rule with location threshold', async () => {
        const rule = await ruleHelper.createCustomStatusRule({
          params,
          name: 'When down from 2 locations',
        });
        ruleId = rule.id;
        expect(rule.params).to.eql(params);
      });

      let monitor: any;

      it('creates a monitor', async () => {
        monitor = await ruleHelper.addMonitor('Monitor location based at ' + moment().format('LT'));
        expect(monitor).to.have.property('id');

        await ruleHelper.makeSummaries({
          monitor,
          downChecks: 1,
        });
      });

      it('should not trigger down alert based on location threshold with one location down', async () => {
        // ensure alert does not fire
        try {
          const response = await ruleHelper.waitForStatusAlert({
            ruleId,
            filters: [
              { term: { 'kibana.alert.status': 'active' } },
              {
                term: { 'monitor.id': monitor.id },
              },
            ],
          });
          const alert: any = response.hits.hits?.[0]._source;
          expect(alert).to.have.property('kibana.alert.status', 'active');
          expect(alert['kibana.alert.reason']).to.eql(
            `Monitor "${monitor.name}" is down from 1 location (Dev Service). Alert when monitor is down from 1 location.`
          );
          throw new Error('Alert was triggered when condition should not be met');
        } catch (e) {
          if (e.message === 'Alert was triggered when condition should not be met') {
            throw e;
          }
        }
      });

      const statusConfigs = [
        {
          checks: {
            down: 1,
            downWithinXChecks: 1,
          },
          ping: {
            observer: {
              geo: {
                name: 'Dev Service',
              },
            },
          },
        },
        {
          checks: {
            down: 1,
            downWithinXChecks: 1,
          },
          ping: {
            observer: {
              geo: {
                name: 'Dev Service 2',
              },
            },
          },
        },
      ] as AlertStatusMetaDataCodec[];

      it('should trigger down alert based on location threshold with two locations down', async () => {
        await ruleHelper.makeSummaries({
          monitor,
          downChecks: 1,
          location: {
            id: 'dev2',
            label: 'Dev Service 2',
          },
        });
        await ruleHelper.makeSummaries({
          monitor,
          downChecks: 1,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [
            { term: { 'kibana.alert.status': 'active' } },
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });
        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');

        const reasonMessage = getUngroupedReasonMessage({
          statusConfigs,
          monitorName: monitor.name,
          params,
        });

        expect(alert['kibana.alert.reason']).to.eql(reasonMessage);
      });

      it('should trigger recovered alert', async () => {
        await ruleHelper.makeSummaries({
          monitor,
          upChecks: 1,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [
            { term: { 'kibana.alert.status': 'recovered' } },
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });

        const alert = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'recovered');
      });

      let downDocs: any[] = [];

      it('should be down again', async () => {
        downDocs = await ruleHelper.makeSummaries({
          monitor,
          downChecks: 1,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [{ term: { 'kibana.alert.status': 'active' } }],
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        const reasonMessage = getUngroupedReasonMessage({
          statusConfigs,
          monitorName: monitor.name,
          params,
        });
        expect(alert['kibana.alert.reason']).to.eql(reasonMessage);
      });

      let pvtLoc: any = {};
      it('adds another location to monitor to recover it partially', async () => {
        pvtLoc = await ruleHelper.addPrivateLocation();
        await ruleHelper.updateTestMonitor(monitor.id, {
          private_locations: [pvtLoc.id],
        });
        await ruleHelper.makeSummaries({
          monitor,
          location: {
            id: pvtLoc.id,
            label: pvtLoc.label,
          },
          upChecks: 1,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [{ term: { 'kibana.alert.status': 'recovered' } }],
        });

        const alert = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'recovered');
      });

      it('creates a custom rule with 1 location threshold', async () => {
        params = {
          condition: {
            window: {
              numberOfChecks: 1,
            },
            groupBy: 'locationId',
            locationsThreshold: 1,
            downThreshold: 1,
          },
        };
        const rule = await ruleHelper.createCustomStatusRule({
          params,
        });
        ruleId = rule.id;
        expect(rule.params).to.eql(params);

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [{ term: { 'kibana.alert.status': 'active' } }],
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(
          getReasonMessage({
            name: monitor.name,
            location: 'Dev Service',
            timestamp: moment(downDocs[0]['@timestamp']).format('LLL'),
            status: 'down',
            numberOfChecks: 1,
            downThreshold: 1,
            locationsThreshold: 1,
            checks: {
              downWithinXChecks: 1,
              down: 1,
            },
          })
        );
      });

      it('should update message after being down from another location', async function () {
        await ruleHelper.makeSummaries({
          monitor,
          location: {
            id: pvtLoc.id,
            label: pvtLoc.label,
          },
          downChecks: 1,
        });

        await retryService.tryForTime(90000, async () => {
          const response = await ruleHelper.waitForStatusAlert({
            ruleId,
            filters: [{ term: { 'kibana.alert.status': 'active' } }],
          });
          const alert: any = response.hits.hits?.[0]._source;
          expect(alert).to.have.property('kibana.alert.status', 'active');
          expect(alert['kibana.alert.reason']).to.eql(
            getReasonMessage({
              name: monitor.name,
              location: 'Dev Service',
              timestamp: moment(downDocs[0]['@timestamp']).format('LLL'),
              status: 'down',
              numberOfChecks: 1,
              downThreshold: 1,
              locationsThreshold: 1,
              checks: {
                downWithinXChecks: 1,
                down: 1,
              },
            })
          );
        });
      });
    });

    describe('TimeBasedWindow', () => {
      let ruleId = '';

      let monitor: any;

      it('creates a monitor', async () => {
        monitor = await ruleHelper.addMonitor('Monitor time based at ' + moment().format('LT'));
        expect(monitor).to.have.property('id');
      });

      it('creates a custom rule with time based window', async () => {
        const params: StatusRuleParams = {
          condition: {
            locationsThreshold: 1,
            window: {
              time: {
                unit: 'm',
                size: 5,
              },
            },
            groupBy: 'locationId',
            downThreshold: 5,
          },
        };
        const rule = await ruleHelper.createCustomStatusRule({
          params,
          name: 'Status based on checks in a time window',
        });
        expect(rule).to.have.property('id');
        ruleId = rule.id;
        expect(rule.params).to.eql(params);
      });

      it('should trigger down alert', async function () {
        await ruleHelper.makeSummaries({
          monitor,
          downChecks: 5,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [{ term: { 'monitor.id': monitor.id } }],
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.contain(
          `Monitor "${monitor.name}" from Dev Service is down.`
        );
        expect(alert['kibana.alert.reason']).to.contain(
          `Alert when 5 checks are down within the last 5 minutes from at least 1 location.`
        );
      });

      it('should trigger recovered alert', async function () {
        // wait 1 minute for at least 1 down check to fall out of the time window
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        await ruleHelper.makeSummaries({
          monitor,
          upChecks: 10,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [
            { term: { 'kibana.alert.status': 'recovered' } },
            { term: { 'monitor.id': monitor.id } },
          ],
        });

        const alert = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'recovered');
      });
    });
  });
}
