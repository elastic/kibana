/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import { type LogsSynthtraceEsClient, generateLogCategoriesData } from '@kbn/synthtrace';
import { OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { GetLogCategoriesToolResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_log_categories/tool';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const SERVICE_NAME = 'payment-service';
const START = 'now-15m';
const END = 'now';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
      await logsSynthtraceEsClient.clean();

      const range = timerange(START, END);
      const { client, generator } = generateLogCategoriesData({
        range,
        logsEsClient: logsSynthtraceEsClient,
        serviceName: SERVICE_NAME,
      });

      await client.index(generator);
    });

    after(async () => {
      await logsSynthtraceEsClient.clean();
    });

    it('returns categorized logs separated by severity level', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogCategoriesToolResult>({
        id: OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID,
        params: {
          start: START,
          end: END,
          kqlFilter: `service.name:"${SERVICE_NAME}"`,
        },
      });

      expect(results.length).to.be(1);
      const data = results[0].data;

      // Verify structure
      expect(data).to.have.property('highSeverityCategories');
      expect(data).to.have.property('lowSeverityCategories');

      const { highSeverityCategories, lowSeverityCategories } = data;

      // High severity (error, warn) should have categories
      expect(highSeverityCategories!.categories).to.be.an('array');
      expect(highSeverityCategories!.totalHits).to.be.greaterThan(0);

      // Low severity (info, debug, trace) should have categories
      expect(lowSeverityCategories!.categories).to.be.an('array');
      expect(lowSeverityCategories!.totalHits).to.be.greaterThan(0);
    });

    it('categorizes multiple unique log messages into single patterns', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogCategoriesToolResult>({
        id: OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID,
        params: {
          start: START,
          end: END,
          kqlFilter: `service.name:"${SERVICE_NAME}"`,
        },
      });

      const data = results[0].data;
      const allCategories = [
        ...data.highSeverityCategories!.categories,
        ...data.lowSeverityCategories!.categories,
      ];

      // Find the debug log category (should have 600 unique messages categorized)
      const debugCategory = allCategories.find((cat) =>
        cat.pattern.includes('Debug Payment API called with request_id')
      );
      expect(debugCategory).to.not.be(undefined);
      expect(debugCategory!.count).to.be.greaterThan(500); // Many unique messages

      // Find the order processing category (should have 150 unique messages categorized)
      const orderCategory = allCategories.find((cat) =>
        cat.pattern.includes('Processing payment transaction for order')
      );
      expect(orderCategory).to.not.be(undefined);
      expect(orderCategory!.count).to.be.greaterThan(100); // Many unique messages

      // Each category should have required fields
      allCategories.forEach((category) => {
        expect(category).to.have.property('pattern');
        expect(category).to.have.property('regex');
        expect(category).to.have.property('count');
        expect(category.count).to.be.greaterThan(0);

        // Sample should include core fields
        expect(category.sample).to.have.property('message');
        expect(category.sample).to.have.property('@timestamp');
      });
    });

    it('works without kqlFilter', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogCategoriesToolResult>({
        id: OBSERVABILITY_GET_LOG_CATEGORIES_TOOL_ID,
        params: {
          start: START,
          end: END,
        },
      });

      expect(results.length).to.be(1);
      const data = results[0].data;
      expect(data.highSeverityCategories!.categories.length).to.be.greaterThan(0);
      expect(data.lowSeverityCategories!.categories.length).to.be.greaterThan(0);
    });
  });
}
