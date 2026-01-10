/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import {
  type ApmSynthtraceEsClient,
  type InfraSynthtraceEsClient,
  generateHostsData,
  indexAll,
} from '@kbn/synthtrace';
import { OBSERVABILITY_GET_INDEX_INFO_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { IndexOverviewResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_index_info/get_index_overview_handler';
import type { IndexFieldsResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_index_info/get_index_fields_handler';
import type { MultiFieldValuesResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_index_info/get_field_values_handler';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_INDEX_INFO_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let infraSynthtraceEsClient: InfraSynthtraceEsClient;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      infraSynthtraceEsClient = synthtrace.createInfraSynthtraceEsClient();
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

      await infraSynthtraceEsClient.clean();
      await apmSynthtraceEsClient.clean();

      await indexAll(
        generateHostsData({
          range: timerange('now-15m', 'now'),
          infraEsClient: infraSynthtraceEsClient,
          apmEsClient: apmSynthtraceEsClient,
          hosts: [
            {
              name: 'field-discovery-host-01',
              cpuUsage: 0.65,
              memoryUsage: 0.72,
              diskUsage: 0.45,
              cloudProvider: 'aws',
              cloudRegion: 'us-east-1',
              services: ['payment-service'],
            },
            {
              name: 'field-discovery-host-02',
              cpuUsage: 0.35,
              memoryUsage: 0.55,
              diskUsage: 0.25,
              cloudProvider: 'aws',
              cloudRegion: 'us-west-2',
              services: ['order-service'],
            },
          ],
        })
      );
    });

    after(async () => {
      if (infraSynthtraceEsClient) await infraSynthtraceEsClient.clean();
      if (apmSynthtraceEsClient) await apmSynthtraceEsClient.clean();
    });

    describe('operation: "get-overview"', () => {
      it('returns curated fields and data sources', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-overview' },
        });

        const data = results[0].data as unknown as IndexOverviewResult;

        expect(data).to.have.property('curatedFields');
        expect(data).to.have.property('schemas');
        expect(data).to.have.property('dataSources');

        expect(data.curatedFields).to.be.an('array');
        expect(data.schemas).to.have.property('hasEcsData');
        expect(data.schemas).to.have.property('hasOtelData');

        expect(data.dataSources.apm).to.have.property('transaction');
        expect(data.dataSources.logs).to.be.an('array');
        expect(data.dataSources.metrics).to.be.an('array');
      });

      it('discovers host.name from curated list', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-overview' },
        });

        const data = results[0].data as unknown as IndexOverviewResult;
        const hostField = data.curatedFields.find((f) => f.name === 'host.name');

        expect(hostField).to.be.ok();
        expect(hostField!.schema).to.be('ecs');
      });
    });

    describe('operation: "list-fields"', () => {
      it('returns fields grouped by type', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'list-fields', index: 'metrics-*' },
        });

        const data = results[0].data as unknown as IndexFieldsResult;

        expect(data).to.have.property('fieldsByType');
        expect(data.fieldsByType.keyword).to.contain('host.name');
      });

      it('returns empty for non-existent index', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'list-fields', index: 'non-existent-index-12345' },
        });

        const data = results[0].data as unknown as IndexFieldsResult;
        expect(Object.keys(data.fieldsByType)).to.have.length(0);
      });

      it('returns error when index is missing', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'list-fields' },
        });

        expect(results[0].type).to.be('error');
        expect((results[0].data as { message: string }).message).to.contain(
          '"index" is required for operation "list-fields"'
        );
      });

      it('supports kqlFilter parameter', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'list-fields',
            index: 'metrics-*',
            kqlFilter: 'host.name: field-discovery-host-01',
          },
        });

        const data = results[0].data as unknown as IndexFieldsResult;
        expect(Object.keys(data.fieldsByType).length).to.be.greaterThan(0);
      });

      it('supports start and end time range parameters', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'list-fields',
            index: 'metrics-*',
            start: 'now-10m',
            end: 'now',
          },
        });

        const data = results[0].data as unknown as IndexFieldsResult;
        expect(Object.keys(data.fieldsByType).length).to.be.greaterThan(0);
      });
    });

    describe('operation: "get-field-values"', () => {
      it('returns keyword values for host.name', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-field-values', index: 'metrics-*', fields: 'host.name' },
        });

        const data = results[0].data as unknown as MultiFieldValuesResult;
        const hostResult = data.fields['host.name'];

        expect(hostResult.type).to.be('keyword');
        if (hostResult.type === 'keyword') {
          expect(hostResult.values).to.contain('field-discovery-host-01');
          expect(hostResult.values).to.contain('field-discovery-host-02');
        }
      });

      it('returns numeric min/max for numeric field', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: 'system.cpu.total.norm.pct',
          },
        });

        const data = results[0].data as unknown as MultiFieldValuesResult;
        const result = data.fields['system.cpu.total.norm.pct'];

        expect(result.type).to.be('numeric');
        if (result.type === 'numeric') {
          expect(result.min).to.be.a('number');
          expect(result.max).to.be.a('number');
        }
      });

      it('returns date min/max for date field', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-field-values', index: 'metrics-*', fields: '@timestamp' },
        });

        const data = results[0].data as unknown as MultiFieldValuesResult;
        const result = data.fields['@timestamp'];

        expect(result.type).to.be('date');
        if (result.type !== 'date') {
          throw new Error('Expected date field');
        }

        const minDate = new Date(result.min);
        const maxDate = new Date(result.max);

        expect(minDate.getTime()).to.be.a('number');
        expect(maxDate.getTime()).to.be.a('number');
        expect(maxDate.getTime()).to.be.greaterThan(minDate.getTime());
      });

      it('returns error for non-existent field', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: 'non.existent.field',
          },
        });

        const data = results[0].data as unknown as MultiFieldValuesResult;
        expect(data.fields['non.existent.field'].type).to.be('error');
      });

      it('supports batch discovery for multiple fields', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: ['host.name', 'cloud.provider'],
          },
        });

        const data = results[0].data as unknown as MultiFieldValuesResult;

        expect(data.fields['host.name'].type).to.be('keyword');
        expect(data.fields['cloud.provider'].type).to.be('keyword');
      });

      it('returns error when index is missing', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-field-values', fields: 'host.name' },
        });

        expect(results[0].type).to.be('error');
        expect((results[0].data as { message: string }).message).to.contain(
          '"index" and "fields" are required'
        );
      });

      it('returns error when fields is missing', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-field-values', index: 'metrics-*' },
        });

        expect(results[0].type).to.be('error');
        expect((results[0].data as { message: string }).message).to.contain(
          '"index" and "fields" are required'
        );
      });
    });
  });
}
