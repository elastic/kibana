/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import moment from 'moment';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { StatusRuleParams } from '@kbn/synthetics-plugin/common/rules/status_rule';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { SyntheticsRuleHelper, SYNTHETICS_ALERT_ACTION_INDEX } from './synthetics_rule_helper';
import { waitForDocumentInIndex } from '../helpers/alerting_wait_for_helpers';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const server = getService('kibanaServer');
  const retryService = getService('retry');
  const ruleHelper = new SyntheticsRuleHelper(getService);
  const logger = getService('log');
  const esClient = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const supertest = getService('supertest');

  // Failing: See https://github.com/elastic/kibana/issues/202337
  // Failing: See https://github.com/elastic/kibana/issues/196257
  describe.skip('SyntheticsCustomStatusRule', () => {
    const SYNTHETICS_RULE_ALERT_INDEX = '.alerts-observability.uptime.alerts-default';

    before(async () => {
      await server.savedObjects.cleanStandardList();
      await esDeleteAllIndices([SYNTHETICS_ALERT_ACTION_INDEX]);
      await ruleHelper.createIndexAction();
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);
    });

    after(async () => {
      await server.savedObjects.cleanStandardList();
      await esDeleteAllIndices([SYNTHETICS_ALERT_ACTION_INDEX]);
      await esClient.deleteByQuery({
        index: SYNTHETICS_RULE_ALERT_INDEX,
        query: { match_all: {} },
      });
    });

    /* 1. create a monitor
       2. create a custom rule
       3. create a down check scenario
       4. verify alert
       5. create an up check scenario
       6. verify recovered alert
      when verifying recovered alert check:
      - reason
      - recoveryReason
      - recoveryStatus
      - locationNames
      - link message
      - locationId
      when down recovered alert check
      - reason
      - locationNames
      - link message
      - locationId
    */

    describe('NumberOfChecks - location threshold = 1 - grouped by location - 1 location down', () => {
      let ruleId = '';
      let monitor: any;
      let docs: any[] = [];

      it('creates a monitor', async () => {
        monitor = await ruleHelper.addMonitor('Monitor check based at ' + moment().format('LLL'));
        expect(monitor).to.have.property('id');

        docs = await ruleHelper.makeSummaries({
          monitor,
          downChecks: 5,
        });
      });

      it('creates a custom rule', async () => {
        const params = {
          condition: {
            locationsThreshold: 1,
            window: {
              numberOfChecks: 5,
            },
            groupBy: 'locationId',
            downThreshold: 5,
          },
          monitorIds: [monitor.id],
        };
        const rule = await ruleHelper.createCustomStatusRule({
          params,
          name: 'When down 5 times from 1 location',
        });
        ruleId = rule.id;
        expect(rule.params).to.eql(params);
      });

      it('should trigger down alert', async function () {
        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" from Dev Service is down. Monitor is down 5 times within the last 5 checks. Alert when 5 out of the last 5 checks are down from at least 1 location.`
        );
        const downResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });
        expect(downResponse.hits.hits[0]._source).property(
          'reason',
          `Monitor "${monitor.name}" from Dev Service is down. Monitor is down 5 times within the last 5 checks. Alert when 5 out of the last 5 checks are down from at least 1 location.`
        );
        expect(downResponse.hits.hits[0]._source).property('locationNames', 'Dev Service');
        expect(downResponse.hits.hits[0]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(downResponse.hits.hits[0]._source).property('locationId', 'dev');
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
        const recoveredResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          docCountTarget: 2,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });
        expect(recoveredResponse.hits.hits[1]._source).property(
          'reason',
          `Monitor "${monitor.name}" from Dev Service is recovered. Alert when 5 out of the last 5 checks are down from at least 1 location.`
        );
        expect(recoveredResponse.hits.hits[1]._source).property('locationNames', 'Dev Service');
        expect(recoveredResponse.hits.hits[1]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(recoveredResponse.hits.hits[1]._source).property('locationId', 'dev');
        expect(recoveredResponse.hits.hits[1]._source).property(
          'recoveryReason',
          `the monitor is now up again. It ran successfully at ${moment(docs[0]['@timestamp'])
            .tz('UTC')
            .format('MMM D, YYYY @ HH:mm:ss.SSS')}`
        );
        expect(recoveredResponse.hits.hits[1]._source).property('recoveryStatus', 'is now up');
      });
    });

    describe('NumberOfChecks - Location threshold = 1 - grouped by location - 2 down locations', () => {
      let ruleId = '';
      let monitor: any;

      it('creates a monitor', async () => {
        monitor = await ruleHelper.addMonitor('Monitor location based at ' + moment().format('LT'));
        expect(monitor).to.have.property('id');
      });

      it('creates a custom rule with 1 location threshold grouped by location', async () => {
        const params: StatusRuleParams = {
          condition: {
            window: {
              numberOfChecks: 1,
            },
            groupBy: 'locationId',
            locationsThreshold: 1,
            downThreshold: 1,
          },
          monitorIds: [monitor.id],
        };

        const rule = await ruleHelper.createCustomStatusRule({
          params,
        });
        ruleId = rule.id;
        expect(rule.params).to.eql(params);

        await ruleHelper.makeSummaries({
          monitor,
          downChecks: 1,
          location: {
            id: 'dev2',
            label: 'Dev Service 2',
          },
        });
        const downDocs = await ruleHelper.makeSummaries({
          monitor,
          downChecks: 1,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [
            { term: { 'kibana.alert.status': 'active' } },
            { term: { 'monitor.id': monitor.id } },
            { range: { '@timestamp': { gte: downDocs[0]['@timestamp'] } } },
          ],
        });

        response.hits.hits.forEach((hit: any) => {
          const alert: any = response.hits.hits?.[0]._source;
          expect(alert).to.have.property('kibana.alert.status', 'active');
          expect(alert['kibana.alert.reason']).to.eql(
            `Monitor "${monitor.name}" from ${alert['location.name']} is down. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.`
          );
        });

        const downResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
          locationNames: string;
          locationId: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          docCountTarget: 2,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });
        const lastTwoHits = downResponse.hits.hits.slice(-2).map((hit) => hit._source);

        lastTwoHits.forEach((hit) => {
          expect(hit).property(
            'reason',
            `Monitor "${monitor.name}" from ${hit?.locationNames} is down. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.`
          );
          expect(hit).property(
            'linkMessage',
            `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=${hit?.locationId}`
          );
        });
      });
    });

    describe('NumberOfChecks - location threshold = 1 - ungrouped - 1 down location', () => {
      let ruleId = '';
      let monitor: any;
      let docs: any[] = [];

      it('creates a monitor', async () => {
        monitor = await ruleHelper.addMonitor(
          `Monitor check based at ${moment().format('LLL')} ungrouped`
        );
        expect(monitor).to.have.property('id');
      });

      it('creates a custom rule with 1 location threshold ungrouped', async () => {
        const params = {
          condition: {
            locationsThreshold: 1,
            window: {
              numberOfChecks: 5,
            },
            groupBy: 'none',
            downThreshold: 5,
          },
          monitorIds: [monitor.id],
        };
        const rule = await ruleHelper.createCustomStatusRule({
          params,
          name: 'Status based on number of checks',
        });
        ruleId = rule.id;
        expect(rule.params).to.eql(params);
      });

      it('should trigger down for ungrouped', async () => {
        docs = await ruleHelper.makeSummaries({
          monitor,
          downChecks: 5,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [
            { term: { 'kibana.alert.status': 'active' } },
            { term: { 'monitor.id': monitor.id } },
            { range: { '@timestamp': { gte: docs[0]['@timestamp'] } } },
          ],
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" is down 5 times from Dev Service. Alert when down 5 times out of the last 5 checks from at least 1 location.`
        );
        const downResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          docCountTarget: 1,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });
        expect(downResponse.hits.hits[0]._source).property(
          'reason',
          `Monitor "${monitor.name}" is down 5 times from Dev Service. Alert when down 5 times out of the last 5 checks from at least 1 location.`
        );
        expect(downResponse.hits.hits[0]._source).property('locationNames', 'Dev Service');
        expect(downResponse.hits.hits[0]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(downResponse.hits.hits[0]._source).property('locationId', 'dev');
      });

      it('should trigger recovered alert', async () => {
        const upDocs = await ruleHelper.makeSummaries({
          monitor,
          upChecks: 1,
        });
        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [
            { term: { 'kibana.alert.status': 'recovered' } },
            { term: { 'monitor.id': monitor.id } },
            { range: { '@timestamp': { gte: upDocs[0]['@timestamp'] } } },
          ],
        });
        expect(response.hits.hits?.[0]._source).property('kibana.alert.status', 'recovered');
        const recoveredResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          docCountTarget: 2,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });
        expect(recoveredResponse.hits.hits[1]._source).property(
          'reason',
          `Monitor "${monitor.name}" from Dev Service is recovered. Alert when 5 out of the last 5 checks are down from at least 1 location.`
        );
        expect(recoveredResponse.hits.hits[1]._source).property('locationNames', 'Dev Service');
        expect(recoveredResponse.hits.hits[1]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(recoveredResponse.hits.hits[1]._source).property('locationId', 'dev');
        expect(recoveredResponse.hits.hits[1]._source).property(
          'recoveryReason',
          'the alert condition is no longer met'
        );
        expect(recoveredResponse.hits.hits[1]._source).property('recoveryStatus', 'has recovered');
      });
    });

    describe('NumberOfChecks - Location threshold > 1 - ungrouped - 2 down locations', () => {
      let ruleId = '';
      let monitor: any;

      it('creates a monitor', async () => {
        monitor = await ruleHelper.addMonitor(
          `Monitor location based at ${moment().format('LT')} ungrouped 2 locations`
        );
        expect(monitor).to.have.property('id');
      });

      it('creates a custom rule with location threshold', async () => {
        const params: StatusRuleParams = {
          condition: {
            locationsThreshold: 2,
            window: {
              numberOfChecks: 1,
            },
            groupBy: 'none',
            downThreshold: 1,
          },
          monitorIds: [monitor.id],
        };
        const rule = await ruleHelper.createCustomStatusRule({
          params,
          name: 'When down from 2 locations',
        });
        ruleId = rule.id;
        expect(rule.params).to.eql(params);
      });

      it('should not trigger down alert based on location threshold with one location down', async () => {
        // first down check from dev 1
        const docs = await ruleHelper.makeSummaries({
          monitor,
          downChecks: 1,
        });
        // ensure alert does not fire
        try {
          const response = await ruleHelper.waitForStatusAlert({
            ruleId,
            filters: [
              { term: { 'kibana.alert.status': 'active' } },
              {
                term: { 'monitor.id': monitor.id },
              },
              {
                range: {
                  '@timestamp': {
                    gte: docs[0]['@timestamp'],
                  },
                },
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
        // 1st down check from dev 2
        await ruleHelper.makeSummaries({
          monitor,
          downChecks: 1,
          location: {
            id: 'dev2',
            label: 'Dev Service 2',
          },
        });
        // 2nd down check from dev 1
        const downDocs = await ruleHelper.makeSummaries({
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
            {
              range: {
                '@timestamp': {
                  gte: downDocs[0]['@timestamp'],
                },
              },
            },
          ],
        });
        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');

        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" is down 1 time from Dev Service and 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
        );
        const downResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });
        expect(downResponse.hits.hits[0]._source).property(
          'reason',
          `Monitor "${monitor.name}" is down 1 time from Dev Service and 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
        );
        expect(downResponse.hits.hits[0]._source).property(
          'locationNames',
          'Dev Service and Dev Service 2'
        );
        expect(downResponse.hits.hits[0]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(downResponse.hits.hits[0]._source).property('locationId', 'dev and dev2');
      });

      it('should trigger recovered alert', async () => {
        const docs = await ruleHelper.makeSummaries({
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
            {
              range: {
                '@timestamp': {
                  gte: docs[0]['@timestamp'],
                },
              },
            },
          ],
        });

        const alert = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'recovered');
        const recoveryResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          docCountTarget: 2,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });
        expect(recoveryResponse.hits.hits[1]._source).property(
          'reason',
          `Monitor "${monitor.name}" from Dev Service and Dev Service 2 is recovered. Alert when 1 out of the last 1 checks are down from at least 2 locations.`
        );
        expect(recoveryResponse.hits.hits[1]._source).property(
          'locationNames',
          'Dev Service and Dev Service 2'
        );
        expect(recoveryResponse.hits.hits[1]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(recoveryResponse.hits.hits[1]._source).property('locationId', 'dev and dev2');
      });

      let downDocs: any[] = [];

      it('should be down again', async () => {
        downDocs = await ruleHelper.makeSummaries({
          monitor,
          downChecks: 1,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [
            { term: { 'kibana.alert.status': 'active' } },
            { term: { 'monitor.id': monitor.id } },
            { range: { '@timestamp': { gte: downDocs[0]['@timestamp'] } } },
          ],
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" is down 1 time from Dev Service and 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
        );
        const downResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          docCountTarget: 3,
          filters: [{ term: { 'monitor.id': monitor.id } }],
        });
        expect(downResponse.hits.hits[2]._source).property(
          'reason',
          `Monitor "${monitor.name}" is down 1 time from Dev Service and 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
        );
        expect(downResponse.hits.hits[2]._source).property(
          'locationNames',
          'Dev Service and Dev Service 2'
        );
        expect(downResponse.hits.hits[2]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(downResponse.hits.hits[2]._source).property('locationId', 'dev and dev2');
      });

      it('should trigger recovered alert when the location threshold is no longer met', async () => {
        // 2nd down check from dev 1
        const upDocs = await ruleHelper.makeSummaries({
          monitor,
          upChecks: 1,
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [
            { term: { 'kibana.alert.status': 'recovered' } },
            { term: { 'monitor.id': monitor.id } },
            { range: { '@timestamp': { gte: upDocs[0]['@timestamp'] } } },
          ],
        });
        const alert = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'recovered');
        const recoveryResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          docCountTarget: 4,
          filters: [{ term: { 'monitor.id': monitor.id } }],
        });
        expect(recoveryResponse.hits.hits[3]._source).property(
          'reason',
          `Monitor "${monitor.name}" from Dev Service and Dev Service 2 is recovered. Alert when 1 out of the last 1 checks are down from at least 2 locations.`
        );
        expect(recoveryResponse.hits.hits[3]._source).property(
          'locationNames',
          'Dev Service and Dev Service 2'
        );
        expect(recoveryResponse.hits.hits[3]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(recoveryResponse.hits.hits[3]._source).property('locationId', 'dev and dev2');
        expect(recoveryResponse.hits.hits[3]._source).property(
          'recoveryReason',
          'the alert condition is no longer met'
        );
        expect(recoveryResponse.hits.hits[3]._source).property('recoveryStatus', 'has recovered');
      });
    });

    describe('TimeWindow - Location threshold = 1 - grouped by location - 1 down location', () => {
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
          monitorIds: [monitor.id],
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
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" from Dev Service is down. Alert when 5 checks are down within the last 5 minutes from at least 1 location.`
        );
        const downResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });
        expect(downResponse.hits.hits[0]._source).property(
          'reason',
          `Monitor "${monitor.name}" from Dev Service is down. Alert when 5 checks are down within the last 5 minutes from at least 1 location.`
        );
        expect(downResponse.hits.hits[0]._source).property('locationNames', 'Dev Service');
        expect(downResponse.hits.hits[0]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(downResponse.hits.hits[0]._source).property('locationId', 'dev');
      });

      it('should trigger recovered alert', async function () {
        // wait 1 minute for at least 1 down check to fall out of the time window
        await new Promise((resolve) => setTimeout(resolve, 30_000));

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [
            { term: { 'kibana.alert.status': 'recovered' } },
            { term: { 'monitor.id': monitor.id } },
          ],
        });

        const alert = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'recovered');
        const recoveryResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
          docCountTarget: 2,
        });
        expect(recoveryResponse.hits.hits[1]._source).property(
          'reason',
          `Monitor "${monitor.name}" from Dev Service is recovered. Alert when 5 checks are down within the last 5 minutes from at least 1 location.`
        );
        expect(recoveryResponse.hits.hits[1]._source).property(
          'recoveryReason',
          'the alert condition is no longer met'
        );
        expect(recoveryResponse.hits.hits[1]._source).property('recoveryStatus', 'has recovered');
        expect(recoveryResponse.hits.hits[1]._source).property('locationNames', 'Dev Service');
        expect(recoveryResponse.hits.hits[1]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(recoveryResponse.hits.hits[1]._source).property('locationId', 'dev');
      });
    });

    describe('TimeWindow - Location threshold = 1 - grouped by location - 2 down location', () => {
      let ruleId = '';
      let monitor: any;

      it('creates a monitor', async () => {
        monitor = await ruleHelper.addMonitor(
          `Monitor time based at ${moment().format('LT')} grouped 2 locations`
        );
        expect(monitor).to.have.property('id');
      });

      it('creates a custom rule with time based window', async () => {
        const params: StatusRuleParams = {
          condition: {
            window: {
              time: {
                unit: 'm',
                size: 5,
              },
            },
            groupBy: 'locationId',
            locationsThreshold: 2,
            downThreshold: 5,
          },
          monitorIds: [monitor.id],
        };
        const rule = await ruleHelper.createCustomStatusRule({
          params,
          name: 'Status based on checks in a time window when down from 2 locations',
        });
        expect(rule).to.have.property('id');
        ruleId = rule.id;
        expect(rule.params).to.eql(params);
      });

      it('should trigger down alert', async function () {
        // Generate data for 2 locations
        await ruleHelper.makeSummaries({
          monitor,
          downChecks: 5,
          location: monitor.locations[0],
        });
        await ruleHelper.makeSummaries({
          monitor,
          downChecks: 5,
          location: monitor.locations[1],
        });

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [{ term: { 'monitor.id': monitor.id } }],
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" is down 5 times from Dev Service and 5 times from Dev Service 2. Alert when down 5 times within the last 5 minutes from at least 2 locations.`
        );
        const downResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
        });

        expect(downResponse.hits.hits[0]._source).property(
          'reason',
          `Monitor "${monitor.name}" is down 5 times from Dev Service and 5 times from Dev Service 2. Alert when down 5 times within the last 5 minutes from at least 2 locations.`
        );
        expect(downResponse.hits.hits[0]._source).property(
          'locationNames',
          'Dev Service and Dev Service 2'
        );
        expect(downResponse.hits.hits[0]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(downResponse.hits.hits[0]._source).property('locationId', 'dev and dev2');
      });

      it('should trigger alert action', async function () {
        const alertAction = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
          docCountTarget: 1,
        });

        expect(alertAction.hits.hits[0]._source).property(
          'reason',
          `Monitor "${monitor.name}" is down 5 times from Dev Service and 5 times from Dev Service 2. Alert when down 5 times within the last 5 minutes from at least 2 locations.`
        );
        expect(alertAction.hits.hits[0]._source).property(
          'locationNames',
          'Dev Service and Dev Service 2'
        );
        expect(alertAction.hits.hits[0]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(alertAction.hits.hits[0]._source).property('locationId', 'dev and dev2');
      });

      it('should trigger recovered alert', async function () {
        // wait 30 secs for at least 1 down check to fall out of the time window
        await new Promise((resolve) => setTimeout(resolve, 30_000));

        const response = await ruleHelper.waitForStatusAlert({
          ruleId,
          filters: [
            { term: { 'kibana.alert.status': 'recovered' } },
            { term: { 'monitor.id': monitor.id } },
          ],
        });

        const alert = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'recovered');
        const recoveryAction = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          filters: [
            {
              term: { 'monitor.id': monitor.id },
            },
          ],
          docCountTarget: 2,
        });

        expect(recoveryAction.hits.hits[1]._source).property(
          'reason',
          `Monitor "${monitor.name}" from Dev Service and Dev Service 2 is recovered. Alert when 5 checks are down within the last 5 minutes from at least 2 locations.`
        );
        expect(recoveryAction.hits.hits[1]._source).property(
          'recoveryReason',
          'the alert condition is no longer met'
        );
        expect(recoveryAction.hits.hits[1]._source).property('recoveryStatus', 'has recovered');
        expect(recoveryAction.hits.hits[1]._source).property(
          'locationNames',
          'Dev Service and Dev Service 2'
        );
        expect(recoveryAction.hits.hits[1]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(recoveryAction.hits.hits[1]._source).property('locationId', 'dev and dev2');
      });
    });

    // TimeWindow - Location threshold = 1 - ungrouped - 1 down location

    // TimeWindow - Location threshold > 1 - ungrouped - 2 down locations
  });
}
