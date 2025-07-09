/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { cleanup, Dataset, generate, PartialConfig } from '@kbn/data-forge';
import { RoleCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const RULE_TYPE_ID = 'slo.rules.burnRate';
const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
const RULE_ALERT_INDEX = '.alerts-observability.slo.alerts-default';
const RULE_ALERT_INDEX_PATTERN = '.alerts-observability.slo.alerts-*';
const ALERT_ACTION_INDEX = 'alert-action-slo';
const DATA_VIEW_ID = 'data-view-id';

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
  const kibanaServer = getService('kibanaServer');

  describe('Burn rate rule', () => {
    let dataForgeConfig: PartialConfig;
    let dataForgeIndices: string[];
    let actionId: string;
    let ruleId: string;
    let dependencyRuleId: string;
    let editorRoleAuthc: RoleCredentials;
    let adminRoleAuthc: RoleCredentials;
    let currentRoleAuthc: RoleCredentials;
    let internalHeaders: InternalRequestHeader;
    let sloId: string;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esClient.deleteByQuery({
        index: RULE_ALERT_INDEX_PATTERN,
        query: {
          match_all: {},
        },
        conflicts: 'proceed',
      });
      editorRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      currentRoleAuthc = isServerless ? editorRoleAuthc : adminRoleAuthc;
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
        indexing: {
          dataset: 'fake_hosts' as Dataset,
          eventsPerCycle: 1,
          interval: 10000,
          alignEventsToInterval: true,
        },
      };
      dataForgeIndices = await generate({ client: esClient, config: dataForgeConfig, logger });
      await alertingApi.waitForDocumentInIndex({
        indexName: DATA_VIEW,
        docCountTarget: 360,
      });
      await dataViewApi.create({
        roleAuthc: currentRoleAuthc,
        name: DATA_VIEW,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
      });
    });

    after(async () => {
      await supertestWithoutAuth
        .delete(`/api/alerting/rule/${ruleId}`)
        .set(currentRoleAuthc.apiKeyHeader)
        .set(internalHeaders);
      await supertestWithoutAuth
        .delete(`/api/actions/connector/${actionId}`)
        .set(currentRoleAuthc.apiKeyHeader)
        .set(internalHeaders);
      if (ruleId) {
        await esClient.deleteByQuery({
          index: RULE_ALERT_INDEX,
          query: {
            bool: {
              should: [
                { term: { 'kibana.alert.rule.uuid': ruleId } },
                ...(dependencyRuleId
                  ? [{ term: { 'kibana.alert.rule.uuid': dependencyRuleId } }]
                  : []),
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
      }
      await dataViewApi.delete({
        roleAuthc: currentRoleAuthc,
        id: DATA_VIEW_ID,
      });
      await supertestWithoutAuth
        .delete(`/api/observability/slos/${sloId}`)
        .set(currentRoleAuthc.apiKeyHeader)
        .set(internalHeaders);
      await esDeleteAllIndices([ALERT_ACTION_INDEX, ...dataForgeIndices]);
      await cleanup({ client: esClient, config: dataForgeConfig, logger });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(currentRoleAuthc);
      await kibanaServer.savedObjects.cleanStandardList();
      await esClient.deleteByQuery({
        index: RULE_ALERT_INDEX_PATTERN,
        query: {
          match_all: {},
        },
        conflicts: 'proceed',
      });
    });

    describe('Burn rate rule - slo consumer', function () {
      this.tags(['skipMKI']);
      const consumer = 'slo';
      it('creates rule successfully', async () => {
        sloId = uuidv4();
        actionId = await alertingApi.createIndexConnector({
          roleAuthc: currentRoleAuthc,
          name: 'Index Connector: Slo Burn rate API test',
          indexName: ALERT_ACTION_INDEX,
        });

        await sloApi.create(
          {
            id: sloId,
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
          currentRoleAuthc
        );

        // @ts-ignore
        const createdRule = await alertingApi.createRule({
          roleAuthc: currentRoleAuthc,
          ...getSloBurnRateRuleConfiguration({
            sloId,
            consumer,
          }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(currentRoleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
      });

      it('should be active and visible from editor role', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: currentRoleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should be active and visible from slo only role', async () => {
        await samlAuth.setCustomRole(ROLES.slo_only);

        const sloOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: sloOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');

        await samlAuth.invalidateM2mApiKeyWithRoleScope(sloOnlyRole);
        await samlAuth.deleteCustomRole();
      });

      it('should NOT be visible from synthetics only role', async () => {
        await samlAuth.setCustomRole(ROLES.synthetics_only);
        const syntheticsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        try {
          await alertingApi.waitForRuleStatus({
            roleAuthc: syntheticsOnlyRole,
            ruleId,
            expectedStatus: 'active',
            timeout: 1000 * 3,
          });
          throw new Error('Expected rule to not be visible, but it was visible');
        } catch (error) {
          expect(error.message).to.contain('timeout');
        }

        await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });

    describe('Burn rate rule - consumer alerts', function () {
      this.tags(['skipMKI']);
      const consumer = 'alerts';
      it('creates rule successfully', async () => {
        sloId = uuidv4();
        actionId = await alertingApi.createIndexConnector({
          roleAuthc: currentRoleAuthc,
          name: 'Index Connector: Slo Burn rate API test',
          indexName: ALERT_ACTION_INDEX,
        });

        await sloApi.create(
          {
            id: sloId,
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
          currentRoleAuthc
        );

        // @ts-ignore
        const createdRule = await alertingApi.createRule({
          roleAuthc: currentRoleAuthc,
          ...getSloBurnRateRuleConfiguration({
            sloId,
            consumer,
          }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(currentRoleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
      });

      it('should be active and visible from editor role', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: currentRoleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should be active and visible from slo only role', async () => {
        await samlAuth.setCustomRole(ROLES.slo_only);

        const sloOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: sloOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');

        await samlAuth.invalidateM2mApiKeyWithRoleScope(sloOnlyRole);
        await samlAuth.deleteCustomRole();
      });

      it('should NOT be visible from synthetics only role', async () => {
        await samlAuth.setCustomRole(ROLES.synthetics_only);
        const syntheticsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        try {
          await alertingApi.waitForRuleStatus({
            roleAuthc: syntheticsOnlyRole,
            ruleId,
            expectedStatus: 'active',
            timeout: 1000 * 3,
          });
          throw new Error('Expected rule to not be visible, but it was visible');
        } catch (error) {
          expect(error.message).to.contain('timeout');
        }

        await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });

    describe('Burn rate rule - consumer observability', function () {
      this.tags(['skipMKI']);
      const consumer = 'observability';

      it('creates rule successfully', async () => {
        sloId = uuidv4();
        actionId = await alertingApi.createIndexConnector({
          roleAuthc: currentRoleAuthc,
          name: 'Index Connector: Slo Burn rate API test',
          indexName: ALERT_ACTION_INDEX,
        });

        await sloApi.create(
          {
            id: sloId,
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
          currentRoleAuthc
        );

        // @ts-ignore
        const createdRule = await alertingApi.createRule({
          roleAuthc: currentRoleAuthc,
          ...getSloBurnRateRuleConfiguration({
            sloId,
            consumer,
          }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(currentRoleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
      });

      it('should be active and visible from editor role', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: currentRoleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should be active and visible from slo only role', async () => {
        await samlAuth.setCustomRole(ROLES.slo_only);

        const sloOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: sloOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');

        await samlAuth.invalidateM2mApiKeyWithRoleScope(sloOnlyRole);
        await samlAuth.deleteCustomRole();
      });

      it('should NOT be visible from synthetics only role', async () => {
        await samlAuth.setCustomRole(ROLES.synthetics_only);
        const syntheticsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        try {
          await alertingApi.waitForRuleStatus({
            roleAuthc: syntheticsOnlyRole,
            ruleId,
            expectedStatus: 'active',
            timeout: 1000 * 3,
          });
          throw new Error('Expected rule to not be visible, but it was visible');
        } catch (error) {
          expect(error.message).to.contain('timeout');
        }

        await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });

    describe('Burn rate rule - can create - slo only role', function () {
      this.tags(['skipMKI']);
      const consumer = 'slo';
      let sloOnlyRole: RoleCredentials;

      it('creates rule successfully', async () => {
        sloId = uuidv4();
        await samlAuth.setCustomRole(ROLES.slo_only);
        sloOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();

        await sloApi.create(
          {
            id: sloId,
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
          currentRoleAuthc
        );

        // @ts-ignore
        const createdRule = await alertingApi.createRule({
          roleAuthc: currentRoleAuthc,
          ...getSloBurnRateRuleConfiguration({
            sloId,
            consumer,
          }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(currentRoleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
      });

      it('should be active and visible from slo role', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: sloOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');

        await samlAuth.invalidateM2mApiKeyWithRoleScope(sloOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });

    describe('Burn rate rule - can NOT create - synthetics only role', function () {
      this.tags(['skipMKI']);
      const consumer = 'slo';
      let syntheticsOnlyRole: RoleCredentials;

      it('creates rule successfully', async () => {
        sloId = uuidv4();
        await samlAuth.setCustomRole(ROLES.synthetics_only);
        syntheticsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();

        // create SLO first with editor role
        await sloApi.create(
          {
            id: sloId,
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
          currentRoleAuthc
        );

        // verify that synthetics only role cannot create the rule
        // @ts-ignore
        const respponse = await alertingApi.createRule({
          roleAuthc: syntheticsOnlyRole,
          ...getSloBurnRateRuleConfiguration({
            sloId,
            consumer,
          }),
        });
        expect(respponse.statusCode).to.be(403);

        await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });
  });
}

export const ROLES = {
  slo_only: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        spaces: ['*'],
        feature: {
          actions: ['all'],
          maintenanceWindow: ['all'],
          observabilityCasesV3: ['all'],
          slo: ['all'],
        },
      },
    ],
  },
  synthetics_only: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        spaces: ['*'],
        feature: {
          actions: ['all'],
          maintenanceWindow: ['all'],
          observabilityCasesV3: ['all'],
          uptime: ['all'],
        },
      },
    ],
  },
};

export const getSloBurnRateRuleConfiguration = ({
  sloId,
  consumer,
}: {
  sloId: string;
  consumer: string;
}) => ({
  tags: ['observability'],
  consumer,
  name: 'SLO Burn Rate rule',
  ruleTypeId: RULE_TYPE_ID,
  schedule: {
    interval: '1m',
  },
  params: {
    sloId,
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
