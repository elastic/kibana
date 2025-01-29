/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, Dataset, generate, PartialConfig } from '@kbn/data-forge';
import { RoleCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const logger = getService('log');
  const alertingApi = getService('alertingApi');
  const dataViewApi = getService('dataViewApi');
  const sloApi = getService('sloApi');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const expectedConsumer = isServerless ? 'observability' : 'slo';

  describe('Burn rate rule', () => {
    const RULE_TYPE_ID = 'slo.rules.burnRate';
    const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
    const RULE_ALERT_INDEX = '.alerts-observability.slo.alerts-default';
    const ALERT_ACTION_INDEX = 'alert-action-slo';
    const DATA_VIEW_ID = 'data-view-id';
    let dataForgeConfig: PartialConfig;
    let dataForgeIndices: string[];
    let actionId: string;
    let ruleId: string;
    let dependencyRuleId: string;
    let adminRoleAuthc: RoleCredentials;
    let internalHeaders: InternalRequestHeader;

    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      internalHeaders = samlAuth.getInternalRequestHeader();
      dataForgeConfig = {
        schedule: [
          {
            template: 'good',
            start: 'now-15m',
            end: 'now+5m',
            metrics: [
              { name: 'system.cpu.user.pct', method: 'linear', start: 2.5, end: 2.5 },
              { name: 'system.cpu.total.pct', method: 'linear', start: 0.5, end: 0.5 },
              { name: 'system.cpu.total.norm.pct', method: 'linear', start: 0.8, end: 0.8 },
            ],
          },
        ],
        indexing: { dataset: 'fake_hosts' as Dataset, eventsPerCycle: 1, interval: 10000 },
      };
      dataForgeIndices = await generate({ client: esClient, config: dataForgeConfig, logger });
      await alertingApi.waitForDocumentInIndex({
        indexName: DATA_VIEW,
        docCountTarget: 360,
      });
      await dataViewApi.create({
        roleAuthc: adminRoleAuthc,
        name: DATA_VIEW,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
      });
    });

    after(async () => {
      await supertestWithoutAuth
        .delete(`/api/alerting/rule/${ruleId}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders);
      await supertestWithoutAuth
        .delete(`/api/actions/connector/${actionId}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders);
      await esClient.deleteByQuery({
        index: RULE_ALERT_INDEX,
        query: {
          bool: {
            should: [
              { term: { 'kibana.alert.rule.uuid': ruleId } },
              { term: { 'kibana.alert.rule.uuid': dependencyRuleId } },
            ],
          },
        },
        conflicts: 'proceed',
      });
      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'rule.id': ruleId } },
        conflicts: 'proceed',
      });
      await dataViewApi.delete({
        roleAuthc: adminRoleAuthc,
        id: DATA_VIEW_ID,
      });
      await supertestWithoutAuth
        .delete('/api/observability/slos/my-custom-id')
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders);
      await esDeleteAllIndices([ALERT_ACTION_INDEX, ...dataForgeIndices]);
      await cleanup({ client: esClient, config: dataForgeConfig, logger });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    describe('Rule creation', () => {
      it('creates rule successfully', async () => {
        actionId = await alertingApi.createIndexConnector({
          roleAuthc: adminRoleAuthc,
          name: 'Index Connector: Slo Burn rate API test',
          indexName: ALERT_ACTION_INDEX,
        });

        await sloApi.create(
          {
            id: 'my-custom-id',
            name: 'my custom name',
            description: 'my custom description',
            indicator: {
              type: 'sli.kql.custom',
              params: {
                index: DATA_VIEW,
                good: 'system.cpu.total.norm.pct > 1',
                total: 'system.cpu.total.norm.pct: *',
                timestampField: '@timestamp',
              },
            },
            timeWindow: {
              duration: '7d',
              type: 'rolling',
            },
            budgetingMethod: 'occurrences',
            objective: {
              target: 0.999,
            },
            groupBy: '*',
          },
          adminRoleAuthc
        );

        const dependencyRule = await alertingApi.createRule({
          roleAuthc: adminRoleAuthc,
          tags: ['observability'],
          consumer: expectedConsumer,
          name: 'SLO Burn Rate rule - Dependency',
          ruleTypeId: RULE_TYPE_ID,
          schedule: {
            interval: '1m',
          },
          params: {
            sloId: 'my-custom-id',
            windows: [
              {
                id: '1',
                actionGroup: 'slo.burnRate.alert',
                burnRateThreshold: 3.36,
                maxBurnRateThreshold: 720,
                longWindow: {
                  value: 1,
                  unit: 'h',
                },
                shortWindow: {
                  value: 5,
                  unit: 'm',
                },
              },
              {
                id: '2',
                actionGroup: 'slo.burnRate.high',
                burnRateThreshold: 1.4,
                maxBurnRateThreshold: 120,
                longWindow: {
                  value: 6,
                  unit: 'h',
                },
                shortWindow: {
                  value: 30,
                  unit: 'm',
                },
              },
              {
                id: '3',
                actionGroup: 'slo.burnRate.medium',
                burnRateThreshold: 0.7,
                maxBurnRateThreshold: 30,
                longWindow: {
                  value: 24,
                  unit: 'h',
                },
                shortWindow: {
                  value: 120,
                  unit: 'm',
                },
              },
              {
                id: '4',
                actionGroup: 'slo.burnRate.low',
                burnRateThreshold: 0.234,
                maxBurnRateThreshold: 10,
                longWindow: {
                  value: 72,
                  unit: 'h',
                },
                shortWindow: {
                  value: 360,
                  unit: 'm',
                },
              },
            ],
          },
          actions: [],
        });

        dependencyRuleId = dependencyRule.id;
        const createdRule = await alertingApi.createRule({
          roleAuthc: adminRoleAuthc,
          tags: ['observability'],
          consumer: expectedConsumer,
          name: 'SLO Burn Rate rule',
          ruleTypeId: RULE_TYPE_ID,
          schedule: {
            interval: '1m',
          },
          params: {
            sloId: 'my-custom-id',
            dependencies: [
              {
                ruleId: dependencyRule.id,
                actionGroupsToSuppressOn: ['slo.burnRate.alert', 'slo.burnRate.high'],
              },
            ],
            windows: [
              {
                id: '1',
                actionGroup: 'slo.burnRate.alert',
                burnRateThreshold: 3.36,
                maxBurnRateThreshold: 720,
                longWindow: {
                  value: 1,
                  unit: 'h',
                },
                shortWindow: {
                  value: 5,
                  unit: 'm',
                },
              },
              {
                id: '2',
                actionGroup: 'slo.burnRate.high',
                burnRateThreshold: 1.4,
                maxBurnRateThreshold: 120,
                longWindow: {
                  value: 6,
                  unit: 'h',
                },
                shortWindow: {
                  value: 30,
                  unit: 'm',
                },
              },
              {
                id: '3',
                actionGroup: 'slo.burnRate.medium',
                burnRateThreshold: 0.7,
                maxBurnRateThreshold: 30,
                longWindow: {
                  value: 24,
                  unit: 'h',
                },
                shortWindow: {
                  value: 120,
                  unit: 'm',
                },
              },
              {
                id: '4',
                actionGroup: 'slo.burnRate.low',
                burnRateThreshold: 0.234,
                maxBurnRateThreshold: 10,
                longWindow: {
                  value: 72,
                  unit: 'h',
                },
                shortWindow: {
                  value: 360,
                  unit: 'm',
                },
              },
            ],
          },
          actions: [],
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should be active', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: adminRoleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should set correct information in the alert document', async () => {
        const resp = await alertingApi.waitForAlertInIndex({
          indexName: RULE_ALERT_INDEX,
          ruleId,
        });
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.category', 'SLO burn rate');
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.reason',
          'SUPPRESSED - CRITICAL: The burn rate for the past 1h is 1000 and for the past 5m is 1000. Alert when above 3.36 for both windows'
        );
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(adminRoleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(expectedConsumer);
      });
    });
  });
}
