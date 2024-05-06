/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, Dataset, generate, PartialConfig } from '@kbn/data-forge';
import expect from '@kbn/expect';
import {
  Aggregators,
  InfraRuleType,
  MetricThresholdParams,
} from '@kbn/infra-plugin/common/alerting/metrics';

import { COMPARATORS } from '@kbn/alerting-comparators';
import { createRule } from '../../../alerting_api_integration/observability/helpers/alerting_api_helper';
import {
  waitForDocumentInIndex,
  waitForRuleStatus,
} from '../../../alerting_api_integration/observability/helpers/alerting_wait_for_helpers';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');
  const pageObjects = getPageObjects(['common', 'infraHome']);
  const kibanaServer = getService('kibanaServer');

  describe('Infrastructure Source Configuration', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });
    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('with metrics present', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      it('renders the waffle map', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
      });

      it('can change the metric indices to a pattern that matches nothing', async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '/settings');

        const nameInput = await infraSourceConfigurationForm.getNameInput();
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('Modified Source');

        const metricIndicesInput = await infraSourceConfigurationForm.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('does-not-exist-*');

        await infraSourceConfigurationForm.saveInfraSettings();

        await pageObjects.infraHome.waitForLoading();
        await pageObjects.infraHome.getInfraMissingMetricsIndicesCallout();
      });

      it('can clear the input and reset to previous values without saving', async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '/settings');

        const nameInput = await infraSourceConfigurationForm.getNameInput();
        const previousNameInputText = await nameInput.getAttribute('value');
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('New Source');

        const metricIndicesInput = await infraSourceConfigurationForm.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('this-is-new-change-*');

        await infraSourceConfigurationForm.discardInfraSettingsChanges();

        // Check for previous value
        const nameInputText = await nameInput.getAttribute('value');
        expect(nameInputText).to.equal(previousNameInputText);
      });

      it('renders the no indices screen when no indices match the pattern', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.getNoMetricsIndicesPrompt();
      });

      it('can change the metric indices to a remote cluster when connection does not exist', async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '/settings');

        const nameInput = await infraSourceConfigurationForm.getNameInput();
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('Modified Source');

        const metricIndicesInput = await infraSourceConfigurationForm.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('remote_cluster:metricbeat-*');

        await infraSourceConfigurationForm.saveInfraSettings();

        await pageObjects.infraHome.waitForLoading();
        await pageObjects.infraHome.getInfraMissingRemoteClusterIndicesCallout();
      });

      it('renders the no remote cluster screen when no remote cluster connection is available', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.getNoRemoteClusterPrompt();
      });

      it('can change the metric indices back to a pattern that matches something', async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '/settings');

        const metricIndicesInput = await infraSourceConfigurationForm.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('metricbeat-*');

        await infraSourceConfigurationForm.saveInfraSettings();
      });

      it('renders the waffle map again', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
      });
    });

    describe('Infrastructure Source Configuration with Rules', function () {
      const esClient = getService('es');
      const supertest = getService('supertest');
      const esDeleteAllIndices = getService('esDeleteAllIndices');
      const logger = getService('log');
      const retryService = getService('retry');

      describe('Create Metric threshold', () => {
        let ruleId: string;
        let dataForgeConfig: PartialConfig;
        let dataForgeIndices: string[];

        const METRICS_ALERTS_INDEX = '.alerts-observability.metrics.alerts-default';
        const ALERT_ACTION_INDEX = 'alert-action-metric-threshold';

        describe('alert and action creation', () => {
          before(async () => {
            await supertest.patch(`/api/metrics/source/default`).set('kbn-xsrf', 'foo').send({
              anomalyThreshold: 50,
              description: '',
              metricAlias: 'kbn-data-forge-fake_hosts.fake_hosts-*',
              name: 'Default',
            });
            dataForgeConfig = {
              schedule: [
                {
                  template: 'good',
                  start: 'now-10m',
                  end: 'now+5m',
                  metrics: [
                    { name: 'system.cpu.user.pct', method: 'linear', start: 0.9, end: 0.9 },
                  ],
                },
              ],
              indexing: { dataset: 'fake_hosts' as Dataset },
            };
            dataForgeIndices = await generate({
              client: esClient,
              config: dataForgeConfig,
              logger,
            });
            await waitForDocumentInIndex({
              esClient,
              indexName: dataForgeIndices.join(','),
              docCountTarget: 45,
              retryService,
              logger,
            });
            const createdRule = await createRule<MetricThresholdParams>({
              supertest,
              logger,
              esClient,
              ruleTypeId: InfraRuleType.MetricThreshold,
              consumer: 'infrastructure',
              tags: ['infrastructure'],
              name: 'Metric threshold rule',
              params: {
                criteria: [
                  {
                    aggType: Aggregators.AVERAGE,
                    comparator: COMPARATORS.GREATER_THAN,
                    threshold: [0.5],
                    timeSize: 5,
                    timeUnit: 'm',
                    metric: 'system.cpu.user.pct',
                  },
                ],
                sourceId: 'default',
                alertOnNoData: true,
                alertOnGroupDisappear: true,
              },
              schedule: {
                interval: '1m',
              },
            });
            ruleId = createdRule.id;
          });

          after(async () => {
            await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
            await esDeleteAllIndices([ALERT_ACTION_INDEX, ...dataForgeIndices]);
            await esClient.deleteByQuery({
              index: METRICS_ALERTS_INDEX,
              query: { term: { 'kibana.alert.rule.uuid': ruleId } },
            });
            await esClient.deleteByQuery({
              index: '.kibana-event-log-*',
              query: { term: { 'kibana.alert.rule.consumer': 'infrastructure' } },
            });
            await cleanup({ client: esClient, config: dataForgeConfig, logger });
          });

          it('rule should be active', async () => {
            const executionStatus = await waitForRuleStatus({
              id: ruleId,
              expectedStatus: 'active',
              supertest,
              retryService,
              logger,
            });
            expect(executionStatus.status).to.be('active');
          });

          it('should show a warning callout when user edit the index pattern while at least one rule utilize it ', async () => {
            await pageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '/settings');
            const metricIndicesInput = await infraSourceConfigurationForm.getMetricIndicesInput();
            await metricIndicesInput.clearValueWithKeyboard();
            await metricIndicesInput.type('newMatch');
            await pageObjects.infraHome.getInfraIndicesPanelSettingsWarningCalloutUsedByRules();
          });
        });
      });
    });
  });
};
