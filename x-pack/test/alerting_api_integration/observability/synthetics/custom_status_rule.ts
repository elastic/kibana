/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import moment from 'moment';
import { StatusRuleParams } from '@kbn/synthetics-plugin/common/rules/status_rule';
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
          name: 'Status based on number of checks',
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

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" from Dev Service is down. Checked at ${moment(
            docs[4]['@timestamp']
          ).format(
            'LLL'
          )}. Monitor is down 5 times within the last 5 checks. Alert when 5 out of last 5 checks are down.`
        );
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
        params.condition.groupBy = '';
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
          `Monitor "${monitor.name}" is down from Dev Service. Alert when down 5 times.`
        );

        await ruleHelper.deleteMonitor(monitor.id);
      });
    });

    describe('NumberOfLocations', () => {
      let ruleId = '';

      it('creates a custom rule with location threshold', async () => {
        const params: StatusRuleParams = {
          condition: {
            window: {
              numberOfLocations: 2,
            },
            groupBy: 'locationId',
            downThreshold: 1,
          },
        };
        const rule = await ruleHelper.createCustomStatusRule({
          params,
          name: 'Status based on number of locations',
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
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" is down from 2 locations (Dev Service, Dev Service 2). Alert when monitor is down from 2 locations.`
        );
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

      it('should be down again', async () => {
        await ruleHelper.makeSummaries({
          monitor,
          downChecks: 1,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [{ term: { 'kibana.alert.status': 'active' } }],
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" is down from 2 locations (Dev Service, Dev Service 2). Alert when monitor is down from 2 locations.`
        );
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

      it('creates a custom rule with 50% location threshold', async () => {
        const params: StatusRuleParams = {
          condition: {
            window: {
              numberOfLocations: 1,
            },
            groupBy: 'locationId',
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
          `Monitor "${monitor.name}" is down from 1 location (Dev Service). Alert when monitor is down from 1 location.`
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
            `Monitor "${monitor.name}" is down from 2 locations (Dev Service, ${pvtLoc.label}). Alert when monitor is down from 1 location.`
          );
        });
      });
    });

    describe('TimeBasedWindow', () => {
      let ruleId = '';

      let monitor: any;
      let docs: any[] = [];

      it('creates a monitor', async () => {
        monitor = await ruleHelper.addMonitor('Monitor time based at ' + moment().format('LT'));
        expect(monitor).to.have.property('id');
      });

      it('creates a custom rule with time based window', async () => {
        const params: StatusRuleParams = {
          condition: {
            window: {
              time: {
                unit: 'm',
                size: 10,
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
        docs = await ruleHelper.makeSummaries({
          monitor,
          downChecks: 5,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [{ term: { 'monitor.id': monitor.id } }],
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" from Dev Service is down. Checked at ${moment(
            docs[4]['@timestamp']
          ).format('LLL')}. Alert when 5 checks are down within the last 1 minute.`
        );
      });

      it('should trigger recovered alert', async function () {
        docs = await ruleHelper.makeSummaries({
          monitor,
          upChecks: 1,
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
