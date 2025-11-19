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
import type { ErrorResult } from '@kbn/onechat-common';
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

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const ml = getService('ml');
  const retry = getService('retry');

  describe(`tool: ${OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin');
      agentBuilderApiClient = createAgentBuilderApiClient(supertest);

      apmSynthtraceEsClient = await createSyntheticApmDataWithAnomalies({
        getService,
        serviceName: SERVICE_NAME,
        environment: ENVIRONMENT,
        language: 'nodejs',
        start: startUnix,
        end: endUnix,
        spikeStart: SPIKE_START,
        spikeEnd: SPIKE_END,
      });

      // Create anomaly detection job
      await supertest
        .post('/internal/apm/settings/anomaly-detection/jobs')
        .set('kbn-xsrf', 'true') // Add this line to include the XSRF header
        .send({ environments: [ENVIRONMENT] })
        .expect(200);

      await retry.waitFor('ML job to have anomalies', async () => {
        const toolResults =
          await agentBuilderApiClient.executeTool<GetAnomalyDetectionJobsToolResult>({
            id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
            params: { start: START, end: END },
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
            start: START,
            end: END,
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
    });

    it('filters by specific job ID', async () => {
      const anomalyDetetionJobs = await ml.api.getAllAnomalyDetectionJobs();
      const jobId = anomalyDetetionJobs.body.jobs[0].job_id;
      const toolResults =
        await agentBuilderApiClient.executeTool<GetAnomalyDetectionJobsToolResult>({
          id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
          params: { jobIds: [jobId], start: START, end: END },
        });

      expect(toolResults[0].data.jobs).to.have.length(1);
      expect(toolResults[0].data.jobs[0].jobId).to.be(jobId);
    });

    it('returns error for non-existent job ID', async () => {
      const toolResults = await agentBuilderApiClient.executeTool<ErrorResult>({
        id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
        params: {
          jobIds: ['non-existent-job-id'],
          start: START,
          end: END,
        },
      });

      expect(toolResults[0].type).to.be('error');
      expect(toolResults[0].data.message).to.contain('Failed to retrieve anomaly detection jobs');
    });

    it('returns job without anomalies when time range excludes them', async () => {
      // SPIKE_START is 2 hours ago. SPIKE_END is 1 hour ago.
      const earlyStart = 'now-12h';
      const earlyEnd = 'now-3h';

      const toolResults =
        await agentBuilderApiClient.executeTool<GetAnomalyDetectionJobsToolResult>({
          id: OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
          params: {
            start: earlyStart,
            end: earlyEnd,
          },
        });

      const jobs = toolResults[0].data.jobs;
      // Job should exist (it was created), but no anomalies in this window
      expect(jobs).to.have.length(1);
      expect(jobs[0].topAnomalies).to.be.empty();
    });
  });
}
