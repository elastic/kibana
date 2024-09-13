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
import { getUngroupedReasonMessage } from '@kbn/synthetics-plugin/server/alert_rules/status_rule/message_utils';
import { AlertStatusMetaData } from '@kbn/synthetics-plugin/server/alert_rules/status_rule/queries/query_monitor_status_alert';
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

  describe('SyntheticsCustomStatusRule', () => {
    before(async () => {
      await esDeleteAllIndices([SYNTHETICS_ALERT_ACTION_INDEX, 'synthetics-*']);
      await server.savedObjects.cleanStandardList();
      await ruleHelper.createIndexAction();
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);
    });

    after(async () => {
      await server.savedObjects.cleanStandardList();
      await esDeleteAllIndices([SYNTHETICS_ALERT_ACTION_INDEX, 'synthetics-*']);
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
          docCountTarget: 3,
        });
        expect(downResponse.hits.hits[2]._source).property(
          'reason',
          `Monitor "${monitor.name}" is down 5 times from Dev Service. Alert when down 5 times out of the last 5 checks from at least 1 location.`
        );
        expect(downResponse.hits.hits[2]._source).property('locationNames', 'Dev Service');
        expect(downResponse.hits.hits[2]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(downResponse.hits.hits[2]._source).property('locationId', 'dev');

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
      });

      it('should not trigger down alert based on location threshold with one location down', async () => {
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
      ] as AlertStatusMetaData[];

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
          `Monitor "${monitor.name}" is down 1 time from Dev Service | 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
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
        });
        expect(downResponse.hits.hits[0]._source).property(
          'reason',
          `Monitor "${monitor.name}" is down 1 time from Dev Service | 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
        );
        expect(downResponse.hits.hits[0]._source).property(
          'locationNames',
          'Dev Service | Dev Service 2'
        );
        expect(downResponse.hits.hits[0]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(downResponse.hits.hits[0]._source).property('locationId', 'dev | dev2');
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
        });
        expect(recoveryResponse.hits.hits[1]._source).property(
          'reason',
          `Monitor "${monitor.name}" from Dev Service | Dev Service 2 is recovered. Alert when 1 out of the last 1 checks are down from at least 2 locations.`
        );
        expect(recoveryResponse.hits.hits[1]._source).property(
          'locationNames',
          'Dev Service | Dev Service 2'
        );
        expect(recoveryResponse.hits.hits[1]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(recoveryResponse.hits.hits[1]._source).property('locationId', 'dev | dev2');
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
        const reasonMessage = getUngroupedReasonMessage({
          statusConfigs,
          monitorName: monitor.name,
          params,
        });
        expect(alert['kibana.alert.reason']).to.eql(reasonMessage);
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
        });
        expect(downResponse.hits.hits[2]._source).property(
          'reason',
          `Monitor "${monitor.name}" is down 1 time from Dev Service | 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
        );
        expect(downResponse.hits.hits[2]._source).property(
          'locationNames',
          'Dev Service | Dev Service 2'
        );
        expect(downResponse.hits.hits[2]._source).property(
          'linkMessage',
          `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=dev`
        );
        expect(downResponse.hits.hits[2]._source).property('locationId', 'dev | dev2');
      });

      it('creates a custom rule with 1 location threshold ungrouped', async () => {
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
          filters: [
            { term: { 'kibana.alert.status': 'active' } },
            { term: { 'monitor.id': monitor.id } },
            { range: { '@timestamp': { gte: downDocs[0]['@timestamp'] } } },
          ],
        });

        const alert: any = response.hits.hits?.[0]._source;
        expect(alert).to.have.property('kibana.alert.status', 'active');
        expect(alert['kibana.alert.reason']).to.eql(
          `Monitor "${monitor.name}" from Dev Service is down. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.`
        );
        const downResponse = await waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
          locationNames: string;
        }>({
          esClient,
          indexName: SYNTHETICS_ALERT_ACTION_INDEX,
          retryService,
          logger,
          docCountTarget: 5,
        });
        const lastTwoHits = downResponse.hits.hits.slice(-2).map((hit) => hit._source);

        lastTwoHits.forEach((hit) => {
          expect(hit).property(
            'reason',
            `Monitor "${monitor.name}" from ${hit?.locationNames} is down. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.`
          );
          expect(hit).property('locationNames', hit?.locationNames);
          expect(hit).property(
            'linkMessage',
            `- Link: https://localhost:5601/app/synthetics/monitor/${monitor.id}/errors/Test%20private%20location-18524a3d9a7-0?locationId=${hit.locationId}`
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
        await new Promise((resolve) => setTimeout(resolve, 30_000));
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
