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
  type LogsSynthtraceEsClient,
  generateFieldDiscoveryData,
  indexAll,
} from '@kbn/synthtrace';
import { OBSERVABILITY_GET_INDEX_INFO_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { IndexPatternsResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_index_info/get_index_overview_handler';
import type { IndexFieldsResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_index_info/get_index_fields_handler';
import type { FieldValuesRecordResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_index_info/get_field_values_handler';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_INDEX_INFO_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let infraSynthtraceEsClient: InfraSynthtraceEsClient;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      infraSynthtraceEsClient = synthtrace.createInfraSynthtraceEsClient();
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();

      await infraSynthtraceEsClient.clean();
      await apmSynthtraceEsClient.clean();
      await logsSynthtraceEsClient.clean();

      // Generate comprehensive test data using field_discovery scenario
      await indexAll(
        generateFieldDiscoveryData({
          range: timerange('now-15m', 'now'),
          infraEsClient: infraSynthtraceEsClient,
          apmEsClient: apmSynthtraceEsClient,
          logsEsClient: logsSynthtraceEsClient,
          hosts: [
            {
              name: 'field-discovery-host-01',
              cpuUsage: 0.65,
              memoryUsage: 0.72,
              diskUsage: 0.45,
              cloudProvider: 'aws',
              cloudRegion: 'us-east-1',
              k8sNamespace: 'production',
              k8sPodName: 'payment-pod-abc123',
            },
            {
              name: 'field-discovery-host-02',
              cpuUsage: 0.35,
              memoryUsage: 0.55,
              diskUsage: 0.25,
              cloudProvider: 'aws',
              cloudRegion: 'us-west-2',
              k8sNamespace: 'production',
              k8sPodName: 'order-pod-def456',
            },
          ],
          services: [
            {
              name: 'payment-service',
              environment: 'production',
              host: 'field-discovery-host-01',
              agentName: 'nodejs',
              errorRate: 0.1,
              avgLatencyMs: 150,
            },
            {
              name: 'order-service',
              environment: 'production',
              host: 'field-discovery-host-02',
              agentName: 'java',
              errorRate: 0.05,
              avgLatencyMs: 100,
            },
          ],
        })
      );
    });

    after(async () => {
      if (infraSynthtraceEsClient) await infraSynthtraceEsClient.clean();
      if (apmSynthtraceEsClient) await apmSynthtraceEsClient.clean();
      if (logsSynthtraceEsClient) await logsSynthtraceEsClient.clean();
    });

    describe('operation: "get-index-patterns"', () => {
      it('returns observability index patterns', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-index-patterns' },
        });
        const data = results[0].data as unknown as IndexPatternsResult;

        expect(data).to.have.property('indexPatterns');
        expect(data.indexPatterns.apm).to.have.property('transaction');
        expect(data.indexPatterns.apm).to.have.property('span');
        expect(data.indexPatterns.apm).to.have.property('error');
        expect(data.indexPatterns.apm).to.have.property('metric');
        expect(data.indexPatterns.logs).to.be.an('array');
        expect(data.indexPatterns.metrics).to.be.an('array');
        expect(data.indexPatterns.alerts).to.be.an('array');
      });

      it('returns discovered data streams as a flat array', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-index-patterns' },
        });
        const data = results[0].data as unknown as IndexPatternsResult;

        expect(data).to.have.property('dataStreams');
        expect(data.dataStreams).to.be.an('array');
        expect(data.dataStreams.length).to.be.greaterThan(0);
      });

      it('returns data streams with name and dataset properties', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-index-patterns' },
        });
        const data = results[0].data as unknown as IndexPatternsResult;

        // Each data stream should have name and dataset
        const firstStream = data.dataStreams[0];
        expect(firstStream).to.have.property('name');
        expect(firstStream).to.have.property('dataset');
        expect(firstStream.name).to.be.a('string');
        expect(firstStream.dataset).to.be.a('string');
      });

      it('includes system metric data streams for targeted field discovery', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-index-patterns' },
        });
        const data = results[0].data as unknown as IndexPatternsResult;

        // Should include system metrics data streams
        const datasets = data.dataStreams.map((ds) => ds.dataset);
        expect(datasets).to.contain('system.cpu');
        expect(datasets).to.contain('system.memory');
      });

      it('data streams can be used for targeted field discovery', async () => {
        // First, get data streams
        const indexPatternsResults = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-index-patterns' },
        });
        const indexPatternsData = indexPatternsResults[0].data as unknown as IndexPatternsResult;

        // Find the memory data stream
        const memoryStream = indexPatternsData.dataStreams.find(
          (ds) => ds.dataset === 'system.memory'
        );
        expect(memoryStream).to.not.be(undefined);

        // Use the data stream name for targeted field discovery
        const fieldsResults = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'list-fields', index: memoryStream!.name },
        });
        const fieldsData = fieldsResults[0].data as unknown as IndexFieldsResult;

        // Should find memory-specific fields
        const allFields = Object.values(fieldsData.fieldsByType).flat();
        expect(allFields).to.contain('system.memory.total');
        expect(allFields).to.contain('system.memory.used.pct');
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

      it('returns only concrete field types (excludes object, nested, unmapped)', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'list-fields', index: 'metrics-*' },
        });
        const data = results[0].data as unknown as IndexFieldsResult;

        const fieldTypes = Object.keys(data.fieldsByType);
        // Should have concrete field types
        expect(fieldTypes.length).to.be.greaterThan(0);
        // Should NOT include non-concrete types that aren't useful for queries
        const nonConcreteTypes = ['object', 'nested', 'unmapped', 'flattened'];
        nonConcreteTypes.forEach((type) => {
          expect(fieldTypes).to.not.contain(type);
        });
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
          params: { operation: 'get-field-values', index: 'metrics-*', fields: ['host.name'] },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

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
            fields: ['system.cpu.total.norm.pct'],
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

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
          params: { operation: 'get-field-values', index: 'metrics-*', fields: ['@timestamp'] },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

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
            fields: ['non.existent.field'],
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

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
        const data = results[0].data as unknown as FieldValuesRecordResult;

        expect(data.fields['host.name'].type).to.be('keyword');
        expect(data.fields['cloud.provider'].type).to.be('keyword');
      });

      it('returns error when index is missing', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: { operation: 'get-field-values', fields: ['host.name'] },
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

      it('supports wildcard patterns in fields parameter', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: ['system.cpu.*'],
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

        const fieldNames = Object.keys(data.fields);

        // Should have expanded the wildcard to multiple fields
        expect(fieldNames.length).to.be.greaterThan(1);

        // All returned fields should match the pattern
        fieldNames.forEach((field) => {
          expect(field.startsWith('system.cpu.')).to.be(true);
        });

        // Should include expected system.cpu fields
        expect(fieldNames).to.contain('system.cpu.total.norm.pct');
      });

      it('supports multiple wildcard patterns', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: ['system.cpu.*', 'cloud.*'],
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

        const fieldNames = Object.keys(data.fields);

        // Should have fields from both patterns
        const cpuFields = fieldNames.filter((f) => f.startsWith('system.cpu.'));
        const cloudFields = fieldNames.filter((f) => f.startsWith('cloud.'));

        expect(cpuFields.length).to.be.greaterThan(0);
        expect(cloudFields.length).to.be.greaterThan(0);
      });

      it('returns error for wildcard pattern with no matches', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: ['nonexistent.pattern.*'],
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

        const result = data.fields['nonexistent.pattern.*'];
        expect(result.type).to.be('error');
        if (result.type === 'error') {
          expect(result.message).to.contain('No fields match pattern');
        }
      });

      it('does not return parent object fields when querying a specific field', async () => {
        // This tests that fieldCaps parent objects (from passthrough types) are filtered out
        // When querying "host.name", we should NOT get "host" as an error
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: ['host.name'],
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

        const fieldNames = Object.keys(data.fields);

        // Should only return the requested field, not parent objects
        expect(fieldNames).to.eql(['host.name']);
        expect(data.fields['host.name'].type).to.be('keyword');

        // Verify no parent object errors are present
        expect(data.fields).to.not.have.property('host');
      });

      it('handles mixed explicit fields and wildcard patterns', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: ['host.name', 'system.cpu.*'],
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

        const fieldNames = Object.keys(data.fields);

        // Should include explicit field
        expect(fieldNames).to.contain('host.name');
        expect(data.fields['host.name'].type).to.be('keyword');

        // Should include expanded wildcard fields
        const cpuFields = fieldNames.filter((f) => f.startsWith('system.cpu.'));
        expect(cpuFields.length).to.be.greaterThan(0);
      });

      it('returns text samples for text/match_only_text fields', async () => {
        // The message field in logs is typically text or match_only_text type
        // Use logs-generic* to target the scenario's log data specifically
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'logs-generic*',
            fields: ['message'],
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

        const messageResult = data.fields.message;
        expect(messageResult.type).to.be('text');
        if (messageResult.type === 'text') {
          expect(messageResult.samples).to.be.an('array');
          expect(messageResult.samples.length).to.be.greaterThan(0);
          expect(messageResult.samples.length).to.be.lessThan(6); // Max 5 samples
          // Each sample should be a non-empty string
          messageResult.samples.forEach((sample) => {
            expect(sample).to.be.a('string');
            expect(sample.length).to.be.greaterThan(0);
          });
        }
      });

      it('returns IP values as keyword type', async () => {
        // IP fields are treated as keyword type internally
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: ['host.ip'],
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

        const result = data.fields['host.ip'];
        expect(result.type).to.be('keyword');
        if (result.type === 'keyword') {
          expect(result.values).to.be.an('array');
          expect(result.values.length).to.be.greaterThan(0);
        }
      });

      it('applies kqlFilter to numeric field aggregations', async () => {
        // Get CPU values for specific host only
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: ['system.cpu.total.norm.pct'],
            kqlFilter: 'host.name: field-discovery-host-01',
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

        const result = data.fields['system.cpu.total.norm.pct'];
        expect(result.type).to.be('numeric');
        if (result.type === 'numeric') {
          // Host-01 has cpuUsage: 0.65, so min/max should be around that value
          expect(result.min).to.be.greaterThan(0.6);
          expect(result.max).to.be.lessThan(0.7);
        }
      });

      it('applies time range to date field aggregations', async () => {
        const results = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
          params: {
            operation: 'get-field-values',
            index: 'metrics-*',
            fields: ['@timestamp'],
            start: 'now-5m',
            end: 'now',
          },
        });
        const data = results[0].data as unknown as FieldValuesRecordResult;

        const result = data.fields['@timestamp'];
        expect(result.type).to.be('date');
        if (result.type === 'date') {
          const minDate = new Date(result.min);
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

          // Min date should be within last 5 minutes
          expect(minDate.getTime()).to.be.greaterThan(fiveMinutesAgo - 60000); // 1 min tolerance
        }
      });
    });
  });
}
