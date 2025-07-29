/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RoleCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const RULE_TYPE_ID = '.es-query';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const alertingApi = getService('alertingApi');
  const config = getService('config');
  const kibanaServer = getService('kibanaServer');
  const isServerless = config.get('serverless');

  let editorRoleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('Query DSL - Consumers and privileges', function () {
    const ALERT_ACTION_INDEX = 'alert-action-es-query';
    const RULE_ALERT_INDEX = '.alerts-stack.alerts-default';
    let ruleId: string;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esClient.deleteByQuery({
        index: RULE_ALERT_INDEX,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      editorRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = samlAuth.getInternalRequestHeader();
    });

    after(async () => {
      await supertestWithoutAuth
        .delete(`/api/alerting/rule/${ruleId}`)
        .set(editorRoleAuthc.apiKeyHeader)
        .set(internalReqHeader);
      await esClient.deleteByQuery({
        index: RULE_ALERT_INDEX,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'rule.id': ruleId } },
        conflicts: 'proceed',
      });
      await esDeleteAllIndices([ALERT_ACTION_INDEX]);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(editorRoleAuthc);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Rule creation - logs consumer', () => {
      const consumer = 'logs';
      it('creates rule successfully', async () => {
        const createdRule = await alertingApi.helpers.createEsQueryRule({
          roleAuthc: editorRoleAuthc,
          ...getESQueryRuleConfiguration({ consumer }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should be active', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: editorRoleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(editorRoleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
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

    describe('Rule creation - infrastructure consumer', () => {
      const consumer = 'infrastructure';
      it('creates rule successfully', async () => {
        const createdRule = await alertingApi.helpers.createEsQueryRule({
          roleAuthc: editorRoleAuthc,
          ...getESQueryRuleConfiguration({ consumer }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should be active', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: editorRoleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(editorRoleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
      });

      it('should be active and visible from infrastructure only role', async () => {
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

    describe('Rule creation - observability consumer', () => {
      const consumer = 'observability';

      it('creates rule successfully', async () => {
        const createdRule = await alertingApi.helpers.createEsQueryRule({
          roleAuthc: editorRoleAuthc,
          ...getESQueryRuleConfiguration({ consumer }),
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should be active and visible from editor role', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc: editorRoleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(editorRoleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(consumer);
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

    describe('Rule creation - stackAlerts consumer', () => {
      const consumer = 'stackAlerts';

      if (isServerless) {
        it('is forbidden', async () => {
          await alertingApi.helpers.createEsQueryRule({
            roleAuthc: editorRoleAuthc,
            ...getESQueryRuleConfiguration({ consumer }),
            expectedStatusCode: 403,
          });
        });
      } else {
        it('creates rule successfully', async () => {
          const createdRule = await alertingApi.helpers.createEsQueryRule({
            roleAuthc: editorRoleAuthc,
            ...getESQueryRuleConfiguration({ consumer }),
          });
          ruleId = createdRule.id;
          expect(ruleId).not.to.be(undefined);
        });

        it('should find the created rule with correct information about the consumer', async () => {
          const match = await alertingApi.findInRules(editorRoleAuthc, ruleId);
          expect(match).not.to.be(undefined);
          expect(match.consumer).to.be(consumer);
        });

        it('should be active and visible from the editor role', async () => {
          const executionStatus = await alertingApi.waitForRuleStatus({
            roleAuthc: editorRoleAuthc,
            ruleId,
            expectedStatus: 'active',
          });
          expect(executionStatus).to.be('active');
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
      }

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

export const getESQueryRuleConfiguration = ({ consumer }: { consumer: string }) => ({
  consumer,
  name: 'always fire',
  ruleTypeId: RULE_TYPE_ID,
  params: {
    size: 100,
    thresholdComparator: '>',
    threshold: [-1],
    index: ['alert-test-data'],
    timeField: 'date',
    esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
    timeWindowSize: 20,
    timeWindowUnit: 's',
  },
  actions: [],
});
