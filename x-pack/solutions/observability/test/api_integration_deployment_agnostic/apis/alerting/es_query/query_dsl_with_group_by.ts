/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { get } from 'lodash';
import type { Dataset, PartialConfig } from '@kbn/data-forge';
import { cleanup, generate } from '@kbn/data-forge';
import type { RoleCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { ActionDocument } from './types';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const logger = getService('log');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const alertingApi = getService('alertingApi');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const expectedConsumer = isServerless ? 'observability' : 'logs';

  let adminRoleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('Query DQL with group by field', () => {
    const RULE_TYPE_ID = '.es-query';
    const ALERT_ACTION_INDEX = 'alert-action-es-query';
    const RULE_ALERT_INDEX = '.alerts-stack.alerts-default';
    const INDEX = 'kbn-data-forge-fake_hosts.fake_hosts-*';
    let dataForgeConfig: PartialConfig;
    let dataForgeIndices: string[];
    let actionId: string;
    let ruleId: string;

    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
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
      await esDeleteAllIndices([ALERT_ACTION_INDEX, ...dataForgeIndices]);
      await cleanup({ client: esClient, config: dataForgeConfig, logger });
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
            threshold: [1],
            index: [INDEX],
            timeField: '@timestamp',
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            timeWindowSize: 1,
            timeWindowUnit: 'm',
            groupBy: 'top',
            termField: 'host.name',
            termSize: 1,
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
                    grouping: '{{context.grouping}}',
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

      it('should set correct information in the alert document', async () => {
        const resp = await alertingApi.waitForAlertInIndex({
          indexName: RULE_ALERT_INDEX,
          ruleId,
        });

        expect(get(resp.hits.hits[0]._source, 'host.name')).eql(['host-0']);
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.consumer', expectedConsumer);
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.reason',
          'Document count is 3 in the last 1m for host-0 in kbn-data-forge-fake_hosts.fake_hosts-* index. Alert when greater than 1.'
        );
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.evaluation.conditions',
          'Number of matching documents for group "host-0" is greater than 1'
        );
        expect(resp.hits.hits[0]._source).property('kibana.alert.evaluation.value', '3');
        expect(resp.hits.hits[0]._source).property('kibana.alert.evaluation.threshold', 1);
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.name', 'always fire');
        expect(resp.hits.hits[0]._source).property('event.action', 'open');
        expect(resp.hits.hits[0]._source).property('kibana.alert.action_group', 'query matched');
        expect(resp.hits.hits[0]._source).property('kibana.alert.status', 'active');
        expect(resp.hits.hits[0]._source).property('kibana.alert.workflow_status', 'open');
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.category',
          'Elasticsearch query'
        );
      });

      it('should set correct action variables', async () => {
        const resp = await alertingApi.waitForDocumentInIndex<ActionDocument>({
          indexName: ALERT_ACTION_INDEX,
        });

        expect(resp.hits.hits[0]._source?.ruleId).eql(ruleId);
        expect(resp.hits.hits[0]._source?.ruleName).eql('always fire');
        expect(resp.hits.hits[0]._source?.ruleParams).eql(
          '{"size":100,"thresholdComparator":">","threshold":[1],"index":["kbn-data-forge-fake_hosts.fake_hosts-*"],"timeField":"@timestamp","esQuery":"{\\n  \\"query\\":{\\n    \\"match_all\\" : {}\\n  }\\n}","timeWindowSize":1,"timeWindowUnit":"m","groupBy":"top","termField":"host.name","termSize":1,"excludeHitsFromPreviousRun":true,"aggType":"count","searchType":"esQuery"}'
        );
        expect(resp.hits.hits[0]._source?.alertActionGroup).eql('query matched');
        expect(resp.hits.hits[0]._source?.grouping).eql('{"host":{"name":"host-0"}}');
      });
    });
  });
}
