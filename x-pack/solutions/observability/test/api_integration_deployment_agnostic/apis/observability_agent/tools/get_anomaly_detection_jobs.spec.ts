/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { GetAnomalyDetectionJobsToolResult } from '@kbn/observability-agent-plugin/server/tools/get_anomaly_detection_jobs/get_anomaly_detection_jobs';
import { OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID } from '@kbn/observability-agent-plugin/server/tools/get_anomaly_detection_jobs/get_anomaly_detection_jobs';
import datemath from '@elastic/datemath';
import moment from 'moment';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import { createSyntheticApmDataWithAnomalies } from '../utils/synthtrace_scenarios/create_synthetic_apm_data_with_anomalies';

const SERVICE_NAME = 'service-a';
const ENVIRONMENT = 'production';
const START = 'now-12h';
const END = 'now';

const startUnix = datemath.parse(START)!;
const endUnix = datemath.parse(END)!;
const SPIKE_START = endUnix.valueOf() - moment.duration(2, 'hours').asMilliseconds();
const SPIKE_END = endUnix.valueOf() - moment.duration(1, 'hours').asMilliseconds();

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

      await createSyntheticApmDataWithAnomalies({
        getService,
        apmSynthtraceEsClient,
        serviceName: SERVICE_NAME,
        environment: ENVIRONMENT,
        language: 'nodejs',
        start: startUnix,
        end: endUnix,
        spikeStart: SPIKE_START,
        spikeEnd: SPIKE_END,
      });

      await retry.waitFor('ML job to have anomalies', async () => {
        const toolResults =
          await agentBuilderApiClient.executeTool<GetAnomalyDetectionJobsToolResult>({
            id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
            params: { start: START_ISO, end: END_ISO },
          });

        const hasAnomalies = toolResults[0].data.jobs[0].topAnomalies.length > 0;
        return hasAnomalies;
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

      it.only('should contain an anomaly for transaction_throughput with expected values', async () => {
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
      expect(toolResults[0].data.message).to.contain(
        'No anomaly detection jobs found for the provided filters'
      );
    });

    it.only('returns job without anomalies when time range excludes them', async () => {
      const EARLY_START_ISO = START_ISO;
      const EARLY_END_ISO = new Date(
        SPIKE_START - moment.duration(30, 'minutes').asMilliseconds()
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
