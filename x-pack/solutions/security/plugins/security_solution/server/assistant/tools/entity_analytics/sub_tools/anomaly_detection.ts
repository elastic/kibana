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
  { uiSettingsClient, request, soClient, ml, modelProvider, prompt }
) => {
  const anomalyScore = await uiSettingsClient.get<number>(DEFAULT_ANOMALY_SCORE);
  const mlModulesProvider = ml?.modulesProvider(request, soClient);
  const modules = await mlModulesProvider?.listModules?.();
  const moduleJobs = modules?.flatMap((module) => module.jobs) ?? [];
  const securityJobs = moduleJobs.filter(isSecurityJob);
  const jobServiceProvider = ml?.jobServiceProvider(request, soClient);
  const allJobsWithStatus = await jobServiceProvider?.jobsSummary();

  // get all installed security jobs (with any statuses)
  const securityJobsFormatted = securityJobs
    // TODO: Filter out jobs by entity type
    // .filter(
    //   ({ config: { analysis_config: analysisConfig } }: ModuleJob) =>
    //     analysisConfig.influencers === undefined ||
    //     analysisConfig.influencers.includes(EntityTypeToIdentifierField[entityType])
    // )
    .map(({ config: { description, analysis_config: analysisConfig }, id }: ModuleJob) => {
      const jobStatus = allJobsWithStatus?.find((job) => job.id === id);

      return {
        id,
        description,
        influencers: analysisConfig.influencers,
        isJobStarted: jobStatus ? isJobStarted(jobStatus.jobState, jobStatus.datafeedState) : false,

        // custom_settings: job.custom_settings, // do we need to filter by managed or created_by?
        // I noticed that pad jobs don't have the managed: true flag
      };
    });

  const model = await modelProvider.getDefaultModel();
  const recommendedJobsResp = await model.inferenceClient.output({
    id: 'entity_analytics_threat_hunting_ml_anomaly_filter',
    input: `You are a capable security solution analyst that has to filter a list of ML jobs and return only the ones that can satisfy the user prompt.
      Carefully consider the job description and influencers to determine if the job can help answer the user prompt.
      Return only the list of job ids that can be used to answer the user prompt for the given entity type.

      User prompt: "${prompt}""
      Entity type: "${entityType}"
      Available jobs: ${JSON.stringify(securityJobsFormatted)}`,
    schema: {
      type: 'object',
      properties: {
        filteredJobIds: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  });

  const recommendedJobIds = recommendedJobsResp.output.filteredJobIds as string[];
  const recommendedJobs = securityJobsFormatted.filter((job) => recommendedJobIds.includes(job.id));
  const recommendedStartedJobIds = recommendedJobs
    .filter((job) => job.isJobStarted)
    .map((job) => job.id);

  if (recommendedStartedJobIds.length === 0) {
    return {
      message: `There are no started machine learning anomaly detection jobs in this environment that can be used to anser the user prompt for entity type '${entityType}'. 
      The following jobs could be used to answer the user prompt: \n${JSON.stringify(
        recommendedJobIds,
        null,
        2
      )}
      \nThe user needs to start at least one of the jobs so this assistant can answer the prompted.
      You must prompt the user to start the jobs before generating any ES|QL query.

      Here is a full list with all security solution jobs in the environment: \n${JSON.stringify(
        securityJobsFormatted,
        null,
        2
      )}
      `,
    };
  }

  const whereList = recommendedStartedJobIds.map((id) => `"${id}"`).join(', ');
  const whereClause = `| WHERE job_id IN (${whereList})`;

  return {
    message: `When generating ES|QL queries for machine learning jobs, you **MUST ALWAYS** use the following filter: '${whereClause}'
You **MUST ONLY** return anomalies with a 'record_score' bigger than ${anomalyScore} (Anomaly threshold set in the UI settings). Use this filter: "| WHERE record_score > ${anomalyScore}".
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

  ### This is a list of recommended jobs that can be used to answer the user prompt for entity type '${entityType}':
  ${JSON.stringify(recommendedJobs, null, 2)}

  You should suggest the user to install these jobs.
`,
    index: ML_ANOMALIES_INDEX,
  };
};
