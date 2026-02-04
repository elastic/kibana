/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { generateApmErrorData, indexAll, type ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { LlmProxy } from '@kbn/test-suites-xpack-platform/agent_builder_api_integration/utils/llm_proxy';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { timerange } from '@kbn/synthtrace-client';
import { APM_ALERTS_INDEX } from '../../apm/alerts/helpers/alerting_helper';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { setupLlmProxy, teardownLlmProxy } from '../utils/llm_proxy/llm_test_helpers';
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
  const samlAuth = getService('samlAuth');
  const alertingApi = getService('alertingApi');
  const kibanaServer = getService('kibanaServer');
  const observabilityAgentBuilderApi = getService('observabilityAgentBuilderApi');
  const synthtrace = getService('synthtrace');

  describe('AI Insights: Alert', function () {
    // LLM Proxy is not yet supported in cloud environments
    this.tags(['skipCloud']);

    describe('POST /internal/observability_agent_builder/ai_insights/alert', () => {
      let connectorId: string;
      let createdRuleId: string;
      let alertId: string;
      let alertIndexName: string;
      let llmProxy: LlmProxy;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      let roleAuthc: RoleCredentials;
      let internalReqHeader: InternalRequestHeader;

      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        internalReqHeader = samlAuth.getInternalRequestHeader();
        roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        await indexAll(
          generateApmErrorData({
            range: timerange('now-15m', 'now'),
            apmEsClient: apmSynthtraceEsClient,
            serviceName: 'test-service',
            environment: 'production',
            language: 'go',
          })
        );

        // Create a rule and wait for an alert to be generated
        createdRuleId = await createRule({
          getService,
          roleAuthc,
          internalReqHeader,
          data: alertRuleData,
        });

        // Fetch the alert ID from the generated alert
        const es = getService('es');

        // Refresh the index to ensure the alert is searchable
        await es.indices.refresh({ index: APM_ALERTS_INDEX });

        const alertsResponse = await es.search({
          index: APM_ALERTS_INDEX,
          query: {
            bool: {
              filter: [
                { term: { 'kibana.alert.rule.uuid': createdRuleId } },
                { term: { 'kibana.alert.status': 'active' } },
              ],
            },
          },
          size: 1,
        });

        const alertDoc = alertsResponse.hits.hits[0];
        if (!alertDoc) {
          throw new Error(`No alert found for rule ${createdRuleId}`);
        }
        alertId = alertDoc._id as string;
        alertIndexName = alertDoc._index as string;

        ({ llmProxy, connectorId } = await setupLlmProxy(getService));
      });

      after(async () => {
        await teardownLlmProxy(getService, { llmProxy, connectorId });
        await apmSynthtraceEsClient?.clean();

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

        const { status, body } = await observabilityAgentBuilderApi.editor({
          endpoint: 'POST /internal/observability_agent_builder/ai_insights/alert',
          params: { body: { alertId } },
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(status).to.be(200);
        expect(body).to.have.property('summary');
        expect(body).to.have.property('context');
        expect(body.summary).to.be(MOCKED_AI_SUMMARY);
      });

      it('returns context with APM data when service.name is present', async () => {
        llmProxy.clear();

        void llmProxy.interceptors.userMessage({
          response: MOCKED_AI_SUMMARY,
        });

        const { status, body } = await observabilityAgentBuilderApi.editor({
          endpoint: 'POST /internal/observability_agent_builder/ai_insights/alert',
          params: { body: { alertId } },
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(status).to.be(200);
        expect(body.context).to.be.a('string');

        // Context should contain APM service summary and log groups from the synthetic data
        expect(body.context).to.contain('<apmServiceSummary>');
        expect(body.context).to.contain('<logGroups>');
      });

      it('returns no related signals when alert has no service.name', async () => {
        llmProxy.clear();

        const es = getService('es');
        await es.update({
          index: alertIndexName,
          id: alertId,
          refresh: 'wait_for',
          doc: {
            'service.name': null,
          },
        });

        void llmProxy.interceptors.userMessage({
          response: MOCKED_AI_SUMMARY,
        });

        const { status, body } = await observabilityAgentBuilderApi.editor({
          endpoint: 'POST /internal/observability_agent_builder/ai_insights/alert',
          params: { body: { alertId } },
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(status).to.be(200);
        expect(body.context).to.be('No related signals available.');
      });

      it('returns 404 when alert does not exist', async () => {
        llmProxy.clear();

        const { status } = await observabilityAgentBuilderApi.editor({
          endpoint: 'POST /internal/observability_agent_builder/ai_insights/alert',
          params: { body: { alertId: 'non-existent-alert-id' } },
        });
        expect(status).to.be(404);
      });
    });
  });
}
