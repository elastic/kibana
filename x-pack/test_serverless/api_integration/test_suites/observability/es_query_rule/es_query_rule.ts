/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createEsQueryRule } from '../../common/alerting/helpers/alerting_api_helper';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const alertingApi = getService('alertingApi');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('ElasticSearch query rule', () => {
    const RULE_TYPE_ID = '.es-query';
    const ALERT_ACTION_INDEX = 'alert-action-es-query';
    let actionId: string;
    let ruleId: string;

    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });

    after(async () => {
      await supertest
        .delete(`/api/alerting/rule/${ruleId}`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');
      await supertest
        .delete(`/api/actions/connector/${actionId}`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');
      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'rule.id': ruleId } },
        conflicts: 'proceed',
      });
      await esDeleteAllIndices([ALERT_ACTION_INDEX]);
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    describe('Rule creation', () => {
      it('creates rule successfully', async () => {
        actionId = await alertingApi.createIndexConnector({
          roleAuthc,
          name: 'Index Connector: Alerting API test',
          indexName: ALERT_ACTION_INDEX,
        });

        const createdRule = await createEsQueryRule({
          supertestWithoutAuth,
          roleAuthc,
          internalReqHeader,
          consumer: 'observability',
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
          roleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findRule(roleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be('observability');
      });
    });
  });
}
