/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
// import { getPackages } from '@kbn/fleet-plugin/server/services/epm/packages';

import type { ModuleJob } from '@kbn/ml-plugin/common/types/modules';
import type { LEGACY_ML_GROUP_ID, ML_GROUP_ID } from '../../../../common/constants';
import { DEFAULT_ANOMALY_SCORE, ML_GROUP_IDS } from '../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../lib/entity_analytics/types';

import { isJobStarted } from '../../../../common/machine_learning/helpers';

const securitySolutionInternalSchema = z.object({});
export const SECURITY_SOLUTION_TOOL_INTERNAL_ID = 'security-solution-tool';

export const securitySolutionToolInternal = (
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
  ml: EntityAnalyticsRoutesDeps['ml']
): BuiltinToolDefinition<typeof securitySolutionInternalSchema> => {
  return {
    id: SECURITY_SOLUTION_TOOL_INTERNAL_ID,
    description: '',
    schema: securitySolutionInternalSchema,
    type: ToolType.builtin,
    handler: async (_, { esClient, logger, request, toolProvider }) => {
      try {
        const [core, startPlugins] = await getStartServices();

        const spaceId = startPlugins.spaces?.spacesService.getSpaceId(request) || 'default';
        const soClient = core.savedObjects.getScopedClient(request);
        const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);
        const anomalyScore = await uiSettingsClient.get<number>(DEFAULT_ANOMALY_SCORE);

        const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
          soClient,
          esClient
        );

        // const securitySolutionDataViewId = appClient.getSourcererDataViewId();
        const exploreDataViewId = `security-solution-${spaceId}`; // TODO: get the data from the right place
        // TODO We should only return indices that exist
        const dataView = await dataViewsService.get(exploreDataViewId);

        // const packages = await getPackages({
        //   savedObjectsClient: soClient,
        //   category: 'advanced_analytics_ueba',
        //   prerelease: true,
        //   type: 'integration',
        // });

        // // for some reason it doesn't filter the packages by type and category
        // const filteredPackages = packages.filter(
        //   (pkg) => pkg.type === 'integration' && pkg.categories?.includes('advanced_analytics_ueba')
        // );

        // const pkg = filteredPackages.map((pkg) => ({
        //   name: pkg.name,
        //   title: pkg.title,
        //   description: pkg.description,
        //   id: pkg.name,
        //   status: pkg.status,
        //   // to delete
        //   readme: pkg.readme ?? '',
        //   type: pkg.type,

        //   categories: pkg.categories,
        // }));

        const mlModulesProvider = ml?.modulesProvider(request, soClient);
        const modules = await mlModulesProvider?.listModules?.();
        const moduleJobs = modules?.flatMap((module) => module.jobs) ?? [];
        const securityJobs = moduleJobs.filter(isSecurityJob);

        const jobServiceProvider = ml?.jobServiceProvider(request, soClient);
        const allJobsWithStatus = await jobServiceProvider?.jobsSummary();

        // TODO: as scoped client
        // const jobResponse = await esClient.asInternalUser.ml.getJobs({
        //   job_id: ['security'], // pad
        //   allow_no_match: true,
        // });
        // get all installed security jobs (with any statuses)
        const securityJobsFormatted = securityJobs.map(
          async ({ config: { description, analysis_config: analysisConfig }, id }: ModuleJob) => {
            const jobStatus = allJobsWithStatus?.find((job) => job.id === id);
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
              isJobStarted: jobStatus
                ? isJobStarted(jobStatus.jobState, jobStatus.datafeedState)
                : false,

              // custom_settings: job.custom_settings, // do we need to filter by managed or created_by?
              // I noticed that pad jobs don't have the managed: true flag
            };
          }
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `When generating ES|QL queries for logs, you **MUST ALWAYS** use the following from clause (ONLY FOR LOGS AND NOT FOR OTHER INDICES, for entity analytics data call the entity analytics tool instead):
                "FROM ${dataView.getIndexPattern()}"
                
                When generating ES|QL queries for machine learning jobs, you **MUST ALWAYS** use the following from clause (ONLY FOR MACHINE LEARNING JOBS AND NOT FOR OTHER INDICES, for entity analytics data call the entity analytics tool instead):
                "FROM  .ml-anomalies-shared 
                | WHERE job_id IN ("EXAMPLE_OF_JOB_ID")

                These are the security solutions machine learning jobs available for installation:
                ${JSON.stringify(securityJobsFormatted, null, 2)}

                Use your security solution knowledge to and job description to analyse when to query the anomaly job index. Question mentioning "patterns", "unusual" and "anomalous" could suggest that you should query the anomaly job index.
                Fields:
                  * record_score: The anomaly score.
                  * @timestamp: The timestamp of the anomaly.
                  * job_id: The job id of the anomaly.
                  * function: The anomaly function used to calculate the score.
                  * partition_field_name: The field used to segment the analysis.
                  * partition_field_value: The value of the partition field.
                  * actual: The anomalous value that triggered the anomaly creation.
                  * typical: The typical value expected for the field.
                  
                  ### Common influencers fields (Other fields may be available depending on the job): user.name, host.name, agent.name, process.name, client.geo.country_name, client.geo.region_name
                  When jobs have influencers, use the influencers fields to identify the entities that contributed to the anomaly creation.
                  
                You **MUST ONLY** return anomalies with a 'record_score' than ${anomalyScore}. Use this filter: "| WHERE record_score > ${anomalyScore}"                                
                `,
              },
            },
          ],
        };
      } catch (error) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: `Error retrieving security solution data: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['security-solution'],
  };
};

export const isSecurityJob = (job: ModuleJob): boolean =>
  job.config?.groups?.some((group) =>
    ML_GROUP_IDS.includes(group as typeof ML_GROUP_ID | typeof LEGACY_ML_GROUP_ID)
  ) || false;
