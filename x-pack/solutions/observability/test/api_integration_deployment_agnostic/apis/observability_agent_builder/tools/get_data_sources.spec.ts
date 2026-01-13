/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient, LogsSynthtraceEsClient } from '@kbn/synthtrace';
import { generateDataSourcesData, indexAll } from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

interface GetDataSourcesToolResult extends OtherResult {
  data: {
    apm: {
      indexPatterns: {
        transaction: string;
        span: string;
        error: string;
        metric: string;
        onboarding: string;
        sourcemap: string;
      };
    };
    logs: {
      indexPatterns: string[];
    };
    metrics: {
      indexPatterns: string[];
    };
    alerts: {
      indexPattern: string[];
    };
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();

      await apmSynthtraceEsClient.clean();
      await logsSynthtraceEsClient.clean();

      const range = timerange('now-15m', 'now');

      await indexAll(
        generateDataSourcesData({
          range,
          logsEsClient: logsSynthtraceEsClient,
          apmEsClient: apmSynthtraceEsClient,
        })
      );
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
      await logsSynthtraceEsClient.clean();
    });

    describe('when fetching data sources', () => {
      let resultData: GetDataSourcesToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetDataSourcesToolResult>({
          id: OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
          params: {},
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns the correct tool results structure', () => {
        expect(resultData).to.have.property('apm');
        expect(resultData).to.have.property('logs');
        expect(resultData).to.have.property('metrics');
        expect(resultData).to.have.property('alerts');
      });

      it('returns tool results with the relevant index patterns', () => {
        const expectedIndexPatterns = {
          apm: {
            indexPatterns: {
              transaction: 'traces-apm*,apm-*,traces-*.otel-*',
              span: 'traces-apm*,apm-*,traces-*.otel-*',
              error: 'logs-apm*,apm-*,logs-*.otel-*',
              metric: 'metrics-apm*,apm-*,metrics-*.otel-*',
              onboarding: 'apm-*',
              sourcemap: 'apm-*',
            },
          },
          logs: {
            indexPatterns: ['logs-*-*', 'logs-*', 'filebeat-*'],
          },
          metrics: {
            indexPatterns: ['metrics-*', 'metricbeat-*'],
          },
          alerts: {
            indexPattern: ['alerts-observability-*'],
          },
        };

        expect(resultData).to.eql(expectedIndexPatterns);
      });
    });
  });
}
