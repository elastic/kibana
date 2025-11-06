/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModuleJob } from '@kbn/ml-plugin/common/types/modules';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import type { LEGACY_ML_GROUP_ID, ML_GROUP_ID } from '../../../../../common/constants';
import {
  DEFAULT_ANOMALY_SCORE,
  ML_GROUP_IDS,
  ML_ANOMALIES_INDEX,
} from '../../../../../common/constants';
import type { EntityType } from '../../../../../common/search_strategy';
import type { EntityAnalyticsSubPlugin } from './types';

export const isSecurityJob = (job: ModuleJob): boolean =>
  job.config?.groups?.some((group) =>
    ML_GROUP_IDS.includes(group as typeof ML_GROUP_ID | typeof LEGACY_ML_GROUP_ID)
  ) || false;

export const getAnomalyDetectionSubPlugin: EntityAnalyticsSubPlugin = async (
  entityType: EntityType,
  { uiSettingsClient, request, soClient, ml }
) => {
  const anomalyScore = await uiSettingsClient.get<number>(DEFAULT_ANOMALY_SCORE);
  const mlModulesProvider = ml?.modulesProvider(request, soClient);
  const modules = await mlModulesProvider?.listModules?.();
  const moduleJobs = modules?.flatMap((module) => module.jobs) ?? [];
  const securityJobs = moduleJobs.filter(isSecurityJob);
  const jobServiceProvider = ml?.jobServiceProvider(request, soClient);
  const allJobsWithStatus = await jobServiceProvider?.jobsSummary();

  // get all installed security jobs (with any statuses)
  const securityJobsFormatted = securityJobs.map(
    ({ config: { description, analysis_config: analysisConfig }, id }: ModuleJob) => {
      // TODO: Filter out jobs by entity type

      const jobStatus = allJobsWithStatus?.find((job) => job.id === id);
      // TODO: show links for jobs in the UI
      // URLS are only available for public (FE) files.
      // const url = await ml?.managementLocator?.getUrl(
      //   {
      //     page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
      //     pageState: {
      //       jobId: id,
      //     },
      //   },
      //   'anomaly_detection'
      // );

      return {
        id,
        description,
        influencers: analysisConfig.influencers,
        isJobStarted: jobStatus ? isJobStarted(jobStatus.jobState, jobStatus.datafeedState) : false,

        // custom_settings: job.custom_settings, // do we need to filter by managed or created_by?
        // I noticed that pad jobs don't have the managed: true flag
      };
    }
  );

  // Split securityJobsFormatted into started and non-started jobs
  const startedJobs = securityJobsFormatted.filter((job) => job.isJobStarted);
  const nonStartedJobs = securityJobsFormatted.filter((job) => !job.isJobStarted);

  return `When generating ES|QL queries for machine learning jobs, you **MUST ALWAYS** use the following from clause:
                'FROM  ${ML_ANOMALIES_INDEX} | WHERE job_id IN ("EXAMPLE_OF_JOB_ID")'
          **You MUST ALWAYS USE THE ABOVE FROM CLAUSE WHEN QUERYING THE ANOMALY JOB INDEX**      

          You **MUST ONLY** return anomalies with a 'record_score' than ${anomalyScore} (Anomaly threshold set in the UI settings). Use this filter: "| WHERE record_score > ${anomalyScore}"
          All records inside the anomaly job index are of type 'result_type:record'.          
                 
          Fields that you should use to answer the question:
            * record_score: The anomaly score.
            * @timestamp: The timestamp of the anomaly.
            * job_id: The job id of the anomaly.
            * partition_field_name: The field used to segment the analysis.
            * partition_field_value: The value of the partition field.
            * actual: The anomalous value that triggered the anomaly creation.
            * typical: The typical value expected for the field.

            ### Common influencers fields (Other fields may be available depending on the job): user.name, host.name, agent.name, process.name, client.geo.country_name, client.geo.region_name            

            You MUST ALWAYS use the started jobs to answer the question. If no job could satisfy the question, you must interrupt the conversation and inform the user that no job could satisfy the question.

            Started jobs: \n${JSON.stringify(startedJobs, null, 2)}
            Non-started jobs: \n${JSON.stringify(nonStartedJobs, null, 2)}
            `;
};
