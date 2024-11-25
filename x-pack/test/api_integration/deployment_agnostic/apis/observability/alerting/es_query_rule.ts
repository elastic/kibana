/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RoleCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const alertingApi = getService('alertingApi');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const expectedConsumer = isServerless ? 'observability' : 'logs';

  let adminRoleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('ElasticSearch query rule', () => {
    const RULE_TYPE_ID = '.es-query';
    const ALERT_ACTION_INDEX = 'alert-action-es-query';
    const RULE_ALERT_INDEX = '.alerts-stack.alerts-default';
    let actionId: string;
    let ruleId: string;

    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = samlAuth.getInternalRequestHeader();
    });

    after(async () => {
      await supertestWithoutAuth
        .delete(`/api/alerting/rule/${ruleId}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalReqHeader);
      await supertestWithoutAuth
        .delete(`/api/actions/connector/${actionId}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalReqHeader);
      await esClient.deleteByQuery({
        index: RULE_ALERT_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        conflicts: 'proceed',
      });
      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'rule.id': ruleId } },
        conflicts: 'proceed',
      });
      await esDeleteAllIndices([ALERT_ACTION_INDEX]);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    describe('Rule creation', () => {
      it('creates rule successfully', async () => {
        actionId = await alertingApi.createIndexConnector({
          roleAuthc: adminRoleAuthc,
          name: 'Index Connector: Alerting API test',
          indexName: ALERT_ACTION_INDEX,
        });

        const createdRule = await alertingApi.helpers.createEsQueryRule({
          roleAuthc: adminRoleAuthc,
          consumer: expectedConsumer,
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
          actions: [
            {
              group: 'query matched',
              id: actionId,
              params: {
                documents: [
                  {
                    ruleId: '{{rule.id}}',
                    ruleName: '{{rule.name}}',
                    ruleParams: '{{rule.params}}',
                    spaceId: '{{rule.spaceId}}',
                    tags: '{{rule.tags}}',
                    alertId: '{{alert.id}}',
                    alertActionGroup: '{{alert.actionGroup}}',
                    instanceContextValue: '{{context.instanceContextValue}}',
                    instanceStateValue: '{{state.instanceStateValue}}',
                  },
                ],
              },
              frequency: {
                notify_when: 'onActiveAlert',
                throttle: null,
                summary: false,
              },
            },
          ],
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

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findInRules(adminRoleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be(expectedConsumer);
      });
    });
  });
}
