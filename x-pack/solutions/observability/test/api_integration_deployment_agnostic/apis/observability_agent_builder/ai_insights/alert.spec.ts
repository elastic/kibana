/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { createLlmProxy } from '@kbn/test-suites-xpack-platform/onechat_api_integration/utils/llm_proxy';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { APM_ALERTS_INDEX } from '../../apm/alerts/helpers/alerting_helper';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  createLlmProxyActionConnector,
  deleteActionConnector,
} from '../utils/llm_proxy/action_connectors';
import { createSyntheticApmData } from '../utils/synthtrace_scenarios';
import { createRule, deleteRules } from '../utils/alerts/alerting_rules';

const MOCKED_AI_SUMMARY = 'This is a mocked AI insight summary for the alert.';

const alertRuleData = {
  ruleTypeId: ApmRuleType.TransactionErrorRate,
  indexName: APM_ALERTS_INDEX,
  consumer: 'apm',
  environment: 'production',
  threshold: 1,
  windowSize: 1,
  windowUnit: 'h',
  ruleName: 'Test Alert for AI Insight',
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const samlAuth = getService('samlAuth');
  const alertingApi = getService('alertingApi');
  const kibanaServer = getService('kibanaServer');
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe('AI Insights: Alert', function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);

    describe('POST /internal/observability_agent_builder/ai_insights/alert', () => {
      let connectorId: string;
      let createdRuleId: string;
      let alertId: string;
      let llmProxy: LlmProxy;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      let roleAuthc: RoleCredentials;
      let internalReqHeader: InternalRequestHeader;

      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        internalReqHeader = samlAuth.getInternalRequestHeader();
        roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

        ({ apmSynthtraceEsClient } = await createSyntheticApmData({ getService }));

        // Create and run a rule to generate an alert
        createdRuleId = await createRule({
          getService,
          roleAuthc,
          internalReqHeader,
          data: alertRuleData,
        });

        await alertingApi.runRule(roleAuthc, createdRuleId);

        // Fetch the alert ID from the generated alert
        const es = getService('es');
        const alertsResponse = await es.search({
          index: APM_ALERTS_INDEX,
          body: {
            query: {
              bool: {
                filter: [
                  { term: { 'kibana.alert.rule.uuid': createdRuleId } },
                  { term: { 'kibana.alert.status': 'active' } },
                ],
              },
            },
            size: 1,
          },
        });

        const alertDoc = alertsResponse.hits.hits[0];
        alertId = alertDoc?._id as string;

        llmProxy = await createLlmProxy(log);
        connectorId = await createLlmProxyActionConnector(getService, { port: llmProxy.getPort() });
      });

      after(async () => {
        llmProxy.close();
        await deleteActionConnector(getService, { actionId: connectorId });

        await apmSynthtraceEsClient.clean();
        await alertingApi.cleanUpAlerts({
          roleAuthc,
          ruleId: createdRuleId,
          alertIndexName: APM_ALERTS_INDEX,
          consumer: 'apm',
        });
        await deleteRules({ getService, roleAuthc, internalReqHeader });

        await kibanaServer.savedObjects.cleanStandardList();
        await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      it('returns summary and context for a valid alert', async () => {
        void llmProxy.interceptors.userMessage({
          response: MOCKED_AI_SUMMARY,
        });

        const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        const response = await scoped
          .post('/internal/observability_agent_builder/ai_insights/alert')
          .set('kbn-xsrf', 'true')
          .send({ alertId })
          .expect(200);

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(response.body).to.have.property('summary');
        expect(response.body).to.have.property('context');
        expect(response.body.summary).to.be(MOCKED_AI_SUMMARY);
      });

      it('returns context with APM data when service.name is present', async () => {
        llmProxy.clear();

        void llmProxy.interceptors.userMessage({
          response: MOCKED_AI_SUMMARY,
        });

        const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        const response = await scoped
          .post('/internal/observability_agent_builder/ai_insights/alert')
          .set('kbn-xsrf', 'true')
          .send({ alertId })
          .expect(200);

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const { context } = response.body;
        expect(context).to.be.a('string');

        // Context should contain APM service summary and errors from the synthetic data
        expect(context).to.contain('<apmServiceSummary>');
        expect(context).to.contain('<apmErrors>');
      });

      it('returns no related signals when alert has no service.name', async () => {
        llmProxy.clear();

        // Manually index an alert without service.name
        const es = getService('es');
        const alertWithoutServiceName = await es.index({
          index: '.internal.alerts-observability.apm.alerts-default-000001',
          refresh: 'wait_for',
          document: {
            '@timestamp': new Date().toISOString(),
            'kibana.alert.start': new Date().toISOString(),
            'kibana.alert.status': 'active',
            'kibana.alert.rule.name': 'Alert Without Service Name',
            'kibana.alert.rule.consumer': 'apm',
            'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
            'kibana.space_ids': ['default'],
            'event.kind': 'signal',
            'event.action': 'open',
            'kibana.alert.workflow_status': 'open',
          },
        });

        void llmProxy.interceptors.userMessage({
          response: MOCKED_AI_SUMMARY,
        });

        const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        const response = await scoped
          .post('/internal/observability_agent_builder/ai_insights/alert')
          .set('kbn-xsrf', 'true')
          .send({ alertId: alertWithoutServiceName._id })
          .expect(200);

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const { context } = response.body;
        expect(context).to.be('No related signals available.');
      });

      it('returns 404 when alert does not exist', async () => {
        llmProxy.clear();

        const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
        await scoped
          .post('/internal/observability_agent_builder/ai_insights/alert')
          .set('kbn-xsrf', 'true')
          .send({ alertId: 'non-existent-alert-id' })
          .expect(404);
      });
    });
  });
}
