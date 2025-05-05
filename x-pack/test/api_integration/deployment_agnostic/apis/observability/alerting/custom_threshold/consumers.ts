/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { cleanup, generate, Dataset, PartialConfig } from '@kbn/data-forge';
import { Aggregators } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const logger = getService('log');
  const alertingApi = getService('alertingApi');
  const dataViewApi = getService('dataViewApi');
  const samlAuth = getService('samlAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;
  const config = getService('config');
  const isServerless = config.get('serverless');

  describe('consumers', function () {
    // skip until custom roles are supported in serverless
    this.tags(['skipMKI']);
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
    const ALERT_ACTION_INDEX = 'alert-action-threshold';
    const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
    const DATA_VIEW_ID = 'data-view-id';
    const DATA_VIEW_NAME = 'data-view-name';
    let dataForgeConfig: PartialConfig;
    let dataForgeIndices: string[];
    let actionId: string;
    let ruleId: string;
    let alertId: string;

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = samlAuth.getInternalRequestHeader();
      dataForgeConfig = {
        schedule: [
          {
            template: 'good',
            start: 'now-10m',
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
          interval: 60000,
          alignEventsToInterval: true,
        },
      };
      dataForgeIndices = await generate({ client: esClient, config: dataForgeConfig, logger });
      await alertingApi.waitForDocumentInIndex({
        indexName: dataForgeIndices.join(','),
        docCountTarget: 45,
      });
      await dataViewApi.create({
        name: DATA_VIEW_NAME,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
        roleAuthc,
      });
    });

    after(async () => {
      await supertestWithoutAuth
        .delete(`/api/alerting/rule/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(internalReqHeader);
      await supertestWithoutAuth
        .delete(`/api/actions/connector/${actionId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(internalReqHeader);
      await esClient.deleteByQuery({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        conflicts: 'proceed',
      });
      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'rule.id': ruleId } },
        conflicts: 'proceed',
      });
      await dataViewApi.delete({
        id: DATA_VIEW_ID,
        roleAuthc,
      });
      await esDeleteAllIndices([ALERT_ACTION_INDEX, ...dataForgeIndices]);
      await cleanup({ client: esClient, config: dataForgeConfig, logger });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('Custom threshold - Rule creation - consumer observability', () => {
      const consumer = 'observability';
      it('creates rule successfully', async () => {
        actionId = await alertingApi.createIndexConnector({
          roleAuthc,
          name: 'Index Connector: Threshold API test',
          indexName: ALERT_ACTION_INDEX,
        });

        const createdRule = await alertingApi.createRule({
          roleAuthc,
          ...getRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(roleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
      });

      it('should be active and visible from admin role', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should be active and visible from infra only role', async () => {
        await samlAuth.setCustomRole(ROLES.infra_only);

        const infraOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: infraOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should be active and visible from logs only role', async () => {
        await samlAuth.setCustomRole(ROLES.logs_only);

        const logsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: logsOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should NOT visible from synthetics only role', async () => {
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
      });

      it('should NOT visible from stack alerts only role', async () => {
        await samlAuth.setCustomRole(ROLES.stack_alerts_only);
        const stackAlertsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        try {
          await alertingApi.waitForRuleStatus({
            roleAuthc: stackAlertsOnlyRole,
            ruleId,
            expectedStatus: 'active',
            timeout: 1000 * 3,
          });
          throw new Error('Expected rule to not be visible, but it was visible');
        } catch (error) {
          expect(error.message).to.contain('timeout');
        }
      });
    });

    describe('Custom threshold - Rule execution - consumer alerts', () => {
      const consumer = 'alerts';
      it('creates rule successfully', async () => {
        actionId = await alertingApi.createIndexConnector({
          roleAuthc,
          name: 'Index Connector: Threshold API test',
          indexName: ALERT_ACTION_INDEX,
        });

        const createdRule = await alertingApi.createRule({
          roleAuthc,
          ...getRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(roleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
      });

      it('should be active and visible from admin role', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should be active and visible from infra only role', async () => {
        await samlAuth.setCustomRole(ROLES.infra_only);

        const infraOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: infraOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should be active and visible from logs only role', async () => {
        await samlAuth.setCustomRole(ROLES.logs_only);

        const logsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: logsOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should NOT visible from synthetics only role', async () => {
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
      });

      it('should NOT visible from stack alerts only role', async () => {
        await samlAuth.setCustomRole(ROLES.stack_alerts_only);
        const stackAlertsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        try {
          await alertingApi.waitForRuleStatus({
            roleAuthc: stackAlertsOnlyRole,
            ruleId,
            expectedStatus: 'active',
            timeout: 1000 * 3,
          });
          throw new Error('Expected rule to not be visible, but it was visible');
        } catch (error) {
          expect(error.message).to.contain('timeout');
        }
      });
    });

    describe('Custom threshold - Rule execution - consumer logs', () => {
      const consumer = 'logs';
      it('creates rule successfully', async () => {
        actionId = await alertingApi.createIndexConnector({
          roleAuthc,
          name: 'Index Connector: Threshold API test',
          indexName: ALERT_ACTION_INDEX,
        });

        const createdRule = await alertingApi.createRule({
          roleAuthc,
          ...getRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(roleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
      });

      it('should be active and visible from admin role', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should be active and visible from logs only role', async () => {
        await samlAuth.setCustomRole(ROLES.logs_only);

        const logsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: logsOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should NOT be visible from infra only role', async () => {
        await samlAuth.setCustomRole(ROLES.infra_only);
        const infraOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        try {
          await alertingApi.waitForRuleStatus({
            roleAuthc: infraOnlyRole,
            ruleId,
            expectedStatus: 'active',
            timeout: 1000 * 3,
          });
          throw new Error('Expected rule to not be visible, but it was visible');
        } catch (error) {
          expect(error.message).to.contain('timeout');
        }
      });

      it('should NOT visible from synthetics only role', async () => {
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
      });

      it('should NOT visible from stack alerts only role', async () => {
        await samlAuth.setCustomRole(ROLES.stack_alerts_only);
        const stackAlertsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        try {
          await alertingApi.waitForRuleStatus({
            roleAuthc: stackAlertsOnlyRole,
            ruleId,
            expectedStatus: 'active',
            timeout: 1000 * 3,
          });
          throw new Error('Expected rule to not be visible, but it was visible');
        } catch (error) {
          expect(error.message).to.contain('timeout');
        }
      });
    });
  });
}

export const ROLES = {
  stack_alerts_only: {
    elasticsearch: {
      indices: [
        {
          names: ['.alerts-*'],
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
          stackAlerts: ['all'],
        },
      },
    ],
  },
  infra_only: {
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
          infrastructure: ['all'],
        },
      },
    ],
  },
  logs_only: {
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
          logs: ['all'],
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

const getRuleConfiguration = ({
  consumer,
  dataViewId,
}: {
  consumer: string;
  dataViewId: string;
}) => ({
  tags: ['observability'],
  consumer,
  name: 'Threshold rule',
  ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  params: {
    criteria: [
      {
        comparator: COMPARATORS.NOT_BETWEEN,
        threshold: [1, 2],
        timeSize: 1,
        timeUnit: 'm' as const,
        metrics: [{ name: 'A', filter: 'container.id:*', aggType: Aggregators.COUNT }],
      },
    ],
    alertOnNoData: true,
    alertOnGroupDisappear: true,
    searchConfiguration: {
      query: {
        query: 'host.name:*',
        language: 'kuery',
      },
      index: dataViewId,
    },
  },
});
