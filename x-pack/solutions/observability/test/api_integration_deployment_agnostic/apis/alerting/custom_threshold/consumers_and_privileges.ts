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
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const logger = getService('log');
  const alertingApi = getService('alertingApi');
  const dataViewApi = getService('dataViewApi');
  const samlAuth = getService('samlAuth');
  const kibanaServer = getService('kibanaServer');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;
  const config = getService('config');
  const isServerless = config.get('serverless');

  describe('Custom Threshold Rule - consumers and priviledges', function () {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX_PATTERN = '.alerts-observability.threshold.alerts-*';
    const ALERT_ACTION_INDEX = 'alert-action-threshold';
    const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
    const DATA_VIEW_ID = 'data-view-id';
    const DATA_VIEW_NAME = 'data-view-name';
    let dataForgeConfig: PartialConfig;
    let dataForgeIndices: string[];
    let ruleId: string;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esClient.deleteByQuery({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX_PATTERN,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
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
      if (ruleId) {
        await esClient.deleteByQuery({
          index: '.kibana-event-log-*',
          query: { term: { 'rule.id': ruleId } },
          conflicts: 'proceed',
        });
      }
      await dataViewApi.delete({
        id: DATA_VIEW_ID,
        roleAuthc,
      });
      await esDeleteAllIndices([ALERT_ACTION_INDEX, ...dataForgeIndices]);
      await cleanup({ client: esClient, config: dataForgeConfig, logger });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await kibanaServer.savedObjects.cleanStandardList();
      await esClient.deleteByQuery({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX_PATTERN,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    describe('Custom threshold - Rule visibility - consumer observability', () => {
      const consumer = 'observability';
      it('creates rule successfully', async () => {
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

      it('should be active and visible from editor role', async () => {
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

        await samlAuth.invalidateM2mApiKeyWithRoleScope(infraOnlyRole);
        await samlAuth.deleteCustomRole();
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

        await samlAuth.invalidateM2mApiKeyWithRoleScope(logsOnlyRole);
        await samlAuth.deleteCustomRole();
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

        await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });

    describe('Custom threshold - Rule visibility - consumer alerts', () => {
      const consumer = 'alerts';
      it('creates rule successfully', async () => {
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

      it('should be active and visible from editor role', async () => {
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
    });

    describe('Custom threshold - Rule visibility - consumer logs', () => {
      const consumer = 'logs';
      it('creates rule successfully', async () => {
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

      it('should be active and visible from editor role', async () => {
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

        await samlAuth.invalidateM2mApiKeyWithRoleScope(logsOnlyRole);
        await samlAuth.deleteCustomRole();
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

        await samlAuth.invalidateM2mApiKeyWithRoleScope(infraOnlyRole);
        await samlAuth.deleteCustomRole();
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

        await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });

    describe('Custom threshold - Rule visibility - consumer infrastructure', () => {
      const consumer = 'infrastructure';
      it('creates rule successfully', async () => {
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

      it('should be active and visible from editor role', async () => {
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

        await samlAuth.invalidateM2mApiKeyWithRoleScope(infraOnlyRole);
        await samlAuth.deleteCustomRole();
      });

      it('should NOT be visible from logs only role', async () => {
        await samlAuth.setCustomRole(ROLES.logs_only);
        const logsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        try {
          await alertingApi.waitForRuleStatus({
            roleAuthc: logsOnlyRole,
            ruleId,
            expectedStatus: 'active',
            timeout: 1000 * 3,
          });
          throw new Error('Expected rule to not be visible, but it was visible');
        } catch (error) {
          expect(error.message).to.contain('timeout');
        }

        await samlAuth.invalidateM2mApiKeyWithRoleScope(logsOnlyRole);
        await samlAuth.deleteCustomRole();
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

        await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });

    describe('Custom threshold - Rule execution - consumer stackAlerts', () => {
      const consumer = 'stackAlerts';

      if (isServerless) {
        it('is forbidden', async () => {
          const createdRule = await alertingApi.createRule({
            roleAuthc,
            ...getRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
          });
          expect(createdRule.statusCode).to.be(403);
        });
      } else {
        it('creates rule successfully', async () => {
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

        it('should be active and visible from editor role', async () => {
          const executionStatus = await alertingApi.waitForRuleStatus({
            roleAuthc,
            ruleId,
            expectedStatus: 'active',
          });
          expect(executionStatus).to.be('active');
        });

        it('should NOT be visible from logs role', async () => {
          await samlAuth.setCustomRole(ROLES.logs_only);
          const logsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
          try {
            await alertingApi.waitForRuleStatus({
              roleAuthc: logsOnlyRole,
              ruleId,
              expectedStatus: 'active',
              timeout: 1000 * 3,
            });
            throw new Error('Expected rule to not be visible, but it was visible');
          } catch (error) {
            expect(error.message).to.contain('timeout');
          }

          await samlAuth.invalidateM2mApiKeyWithRoleScope(logsOnlyRole);
          await samlAuth.deleteCustomRole();
        });

        it('should NOT be visible from infra role', async () => {
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

          await samlAuth.invalidateM2mApiKeyWithRoleScope(infraOnlyRole);
          await samlAuth.deleteCustomRole();
        });
      }

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

        await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });

    describe('Custom threshold - Rule execution - consumer notavalidconsumer', () => {
      const consumer = 'notavalidconsumer';
      it('creates rule successfully', async () => {
        const createdRule = await alertingApi.createRule({
          roleAuthc,
          ...getRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
        });
        expect(createdRule.statusCode).to.be(403);
        expect(createdRule.message).to.be(
          'Unauthorized by "notavalidconsumer" to create "observability.rules.custom_threshold" rule'
        );
      });
    });

    describe('Custom threshold - Rule execution - consumer undefined', function () {
      const consumer = undefined;
      it('creates rule successfully', async () => {
        const createdRule = await alertingApi.createRule({
          roleAuthc,
          // @ts-ignore
          ...getRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
        });
        expect(createdRule.statusCode).to.be(400);
        expect(createdRule.message).to.be(
          '[request body.consumer]: expected value of type [string] but got [undefined]'
        );
      });
    });

    describe('Custom threshold - Rule creation - logs only role', function () {
      const consumer = 'logs';
      let logsOnlyRole: RoleCredentials;

      it('creates rule successfully', async () => {
        await samlAuth.setCustomRole(ROLES.logs_only);
        logsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const createdRule = await alertingApi.createRule({
          roleAuthc: logsOnlyRole,
          ...getRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(logsOnlyRole, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
      });

      it('should be active and visible from logs only role', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: logsOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('cannot create a rule with infrastructure consumer', async () => {
        const createdRule = await alertingApi.createRule({
          roleAuthc: logsOnlyRole,
          ...getRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer: 'infrastructure' }),
        });
        expect(createdRule.statusCode).to.be(403);

        await samlAuth.invalidateM2mApiKeyWithRoleScope(logsOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });

    describe('Custom threshold - Rule creation - infra only role', function () {
      const consumer = 'infrastructure';
      let infraOnlyRole: RoleCredentials;

      it('creates rule successfully', async () => {
        await samlAuth.setCustomRole(ROLES.infra_only);
        infraOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const createdRule = await alertingApi.createRule({
          roleAuthc: infraOnlyRole,
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

      it('should be active and visible from logs only role', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: infraOnlyRole,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('cannot create a rule with logs consumer', async () => {
        const createdRule = await alertingApi.createRule({
          roleAuthc: infraOnlyRole,
          ...getRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer: 'logs' }),
        });
        expect(createdRule.statusCode).to.be(403);

        await samlAuth.invalidateM2mApiKeyWithRoleScope(infraOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });

    describe('Custom threshold - rule cannot be created - synthetics only role', function () {
      const consumer = 'logs';
      it('creates rule successfully', async () => {
        await samlAuth.setCustomRole(ROLES.synthetics_only);
        const syntheticsOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
        const response = await alertingApi.createRule({
          roleAuthc: syntheticsOnlyRole,
          ...getRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
        });
        expect(response.statusCode).to.be(403);

        await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsOnlyRole);
        await samlAuth.deleteCustomRole();
      });
    });
  });
}

export const ROLES = {
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
          indexPatterns: ['all'],
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
          indexPatterns: ['all'],
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
