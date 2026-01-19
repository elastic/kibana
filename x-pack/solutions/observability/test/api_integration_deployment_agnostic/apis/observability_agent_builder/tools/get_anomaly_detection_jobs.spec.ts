/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { generateApmDataWithAnomalies } from '@kbn/synthtrace';
import type { GetAnomalyDetectionJobsToolResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_anomaly_detection_jobs/tool';
import { OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools/get_anomaly_detection_jobs/tool';
import datemath from '@elastic/datemath';
import { duration as momentDuration } from 'moment';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const SERVICE_NAME = 'service-a';
const ENVIRONMENT = 'production';
const START = 'now-12h';
const END = 'now';

const startUnix = datemath.parse(START)!;
const endUnix = datemath.parse(END)!;

// The generator places the spike in the last 2 hours of the range
const SPIKE_START = endUnix.valueOf() - momentDuration(2, 'hours').asMilliseconds();

const START_ISO = new Date(startUnix.valueOf()).toISOString();
const END_ISO = new Date(endUnix.valueOf()).toISOString();

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const ml = getService('ml');
  const retry = getService('retry');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin');
      agentBuilderApiClient = createAgentBuilderApiClient(supertest);
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

      // Clean up before generating data
      await Promise.all([apmSynthtraceEsClient.clean(), ml.api.cleanMlIndices()]);
      await ml.api.deleteAllAnomalyDetectionJobs();

      // Generate APM data with anomalies using timerange
      const range = timerange(startUnix.toDate(), endUnix.toDate());
      const { client, generator } = generateApmDataWithAnomalies({
        apmEsClient: apmSynthtraceEsClient,
        range,
        serviceName: SERVICE_NAME,
        environment: ENVIRONMENT,
        language: 'nodejs',
      });
      await client.index(generator);

      // Create anomaly detection job
      const editorClient = await roleScopedSupertest.getSupertestWithRoleScope('editor', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });

      await editorClient
        .post('/internal/apm/settings/anomaly-detection/jobs')
        .send({ environments: [ENVIRONMENT] })
        .expect(200);

      await retry.waitFor('ML job to have anomalies', async () => {
        const toolResults =
          await agentBuilderApiClient.executeTool<GetAnomalyDetectionJobsToolResult>({
            id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
            params: { start: START_ISO, end: END_ISO },
          });

        const { topAnomalies } = toolResults[0].data.jobs[0];
        const hasLatencyAnomaly = topAnomalies.some(
          ({ fieldName }) => fieldName === 'transaction_latency'
        );
        const hasThroughputAnomaly = topAnomalies.some(
          ({ fieldName }) => fieldName === 'transaction_throughput'
        );

        return hasLatencyAnomaly && hasThroughputAnomaly;
      });
    });

    after(async () => {
      await Promise.all([apmSynthtraceEsClient.clean(), ml.api.cleanMlIndices()]);
      await ml.api.deleteAllAnomalyDetectionJobs();
    });

    describe('when retrieving anomaly detection jobs in the specified time range', () => {
      let toolResults: GetAnomalyDetectionJobsToolResult[];

      before(async () => {
        toolResults = await agentBuilderApiClient.executeTool<GetAnomalyDetectionJobsToolResult>({
          id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
          params: {
            start: START_ISO,
            end: END_ISO,
          },
        });
      });

      it('should return one job', async () => {
        const jobs = toolResults[0].data.jobs;
        expect(jobs).to.have.length(1);
      });

      it('should have anomalies', async () => {
        const jobs = toolResults[0].data.jobs;
        const { topAnomalies } = jobs[0];
        expect(topAnomalies.length).to.be.greaterThan(0);
      });

      it('should have anomalyScore attribute', async () => {
        const jobs = toolResults[0].data.jobs;
        const { topAnomalies } = jobs[0];
        topAnomalies.forEach((anomaly) => {
          expect(anomaly).to.have.keys(['anomalyScore']);
        });
      });

      it('should contain an anomaly for transaction_throughput with expected values', async () => {
        const jobs = toolResults[0].data.jobs;
        const { topAnomalies } = jobs[0];

        const throughputAnomaly = topAnomalies.find(
          (anomaly) => anomaly.fieldName === 'transaction_throughput'
        );

        expect(throughputAnomaly?.byFieldName).to.be('transaction.type');
        expect(throughputAnomaly?.byFieldValue).to.be('request');
        expect(throughputAnomaly?.partitionFieldName).to.be('service.name');
        expect(throughputAnomaly?.partitionFieldValue).to.be('service-a');
        expect(throughputAnomaly?.fieldName).to.be('transaction_throughput');
        expect(throughputAnomaly?.anomalyScore).to.be.greaterThan(10);
      });

      it('should have correct detector configurations', async () => {
        const jobs = toolResults[0].data.jobs;
        expect(jobs[0].detectors).to.eql([
          {
            description: 'high latency by transaction type for an APM service',
            function: 'high_mean',
            fieldName: 'transaction_latency',
          },
          {
            description: 'transaction throughput for an APM service',
            function: 'mean',
            fieldName: 'transaction_throughput',
          },
          {
            description: 'failed transaction rate for an APM service',
            function: 'high_mean',
            fieldName: 'failed_transaction_rate',
          },
        ]);
      });

      it('should include job stats', async () => {
        const jobs = toolResults[0].data.jobs;
        const job = jobs[0];

        // jobStats should be present with state and data coverage
        expect(job).to.have.property('jobStats');
        expect(job.jobStats.state).to.be('opened');

        expect(job.jobStats.lastRecordTimestamp).to.be.a('number');
        expect(job.jobStats.lastRecordTimestamp).to.be.greaterThan(0);

        expect(job.jobStats.processedRecordCount).to.be.a('number');
        expect(job.jobStats.processedRecordCount).to.be.greaterThan(0);
      });
    });

    it('filters by specific job ID', async () => {
      const anomalyDetetionJobs = await ml.api.getAllAnomalyDetectionJobs();
      const jobId = anomalyDetetionJobs.body.jobs[0].job_id;
      const toolResults =
        await agentBuilderApiClient.executeTool<GetAnomalyDetectionJobsToolResult>({
          id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
          params: { jobIds: [jobId], start: START_ISO, end: END_ISO },
        });

      expect(toolResults[0].data.jobs).to.have.length(1);
      expect(toolResults[0].data.jobs[0].jobId).to.be(jobId);
    });

    it('returns empty response for non-existent job ID', async () => {
      const toolResults =
        await agentBuilderApiClient.executeTool<GetAnomalyDetectionJobsToolResult>({
          id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
          params: {
            jobIds: ['non-existent-job-id'],
            start: START_ISO,
            end: END_ISO,
          },
        });

      expect(toolResults[0].data.jobs).to.be.empty();
      expect(toolResults[0].data.total).to.be(0);
    });

    it('returns job without anomalies when time range excludes them', async () => {
      // Start check 4 hours before spike to avoid start of dataset initialization noise
      const EARLY_START_ISO = new Date(
        SPIKE_START - momentDuration(4, 'hours').asMilliseconds()
      ).toISOString();
      const EARLY_END_ISO = new Date(
        SPIKE_START - momentDuration(30, 'minutes').asMilliseconds()
      ).toISOString();

      const toolResults =
        await agentBuilderApiClient.executeTool<GetAnomalyDetectionJobsToolResult>({
          id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
          params: {
            start: EARLY_START_ISO,
            end: EARLY_END_ISO,
          },
        });

      const jobs = toolResults[0].data.jobs;
      // Job should exist (it was created), but no anomalies in this window
      expect(jobs).to.have.length(1);
      expect(jobs[0].topAnomalies).to.be.empty();
    });
  });
}
