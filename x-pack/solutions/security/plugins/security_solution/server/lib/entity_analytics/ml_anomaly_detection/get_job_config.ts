/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { MlDetector, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';
import {
  tactics as mitreTactics,
  techniques as mitreTechniques,
  subtechniques as mitreSubtechniques,
} from '../../../../common/detection_engine/mitre/mitre_tactics_techniques';

export interface JobConfig {
  sourceIndex: string[];
  datafeedQuery: QueryDslQueryContainer;
  detectors: MlDetector[];
  bucketSpanMs: number;
  jobName: string | null;
  threatTactics: string[];
  threatTechniques: string[];
  hasThreatTactics: boolean;
}

interface JobCustomSettings {
  security_app_display_name?: string;
  threat_tactics?: string[];
  threat_techniques?: string[];
}

interface GetJobConfigOpts {
  jobIds: string[];
  logger: Logger;
  ml: MlPluginSetup;
  request: KibanaRequest;
  soClient: SavedObjectsClientContract;
}

const tacticNameById = new Map(mitreTactics.map(({ id, name }) => [id, name]));
const techniqueNameById = new Map(
  [...mitreTechniques, ...mitreSubtechniques].map(({ id, name }) => [id, name])
);

/**
 * Live jobs keep whatever custom_settings they were created with, since job setup
 * only ever creates (never updates) a job that already exists. For jobs whose live
 * custom_settings has no threat_tactics, fall back to the module definitions shipped
 * with the ML plugin, which always reflect the current package version.
 */
const getModuleCustomSettingsByJobId = async ({
  jobIds,
  ml,
  logger,
  request,
  soClient,
}: Pick<GetJobConfigOpts, 'ml' | 'logger' | 'request' | 'soClient'> & {
  jobIds: string[];
}): Promise<Map<string, JobCustomSettings>> => {
  const result = new Map<string, JobCustomSettings>();
  if (!jobIds.length) return result;

  try {
    const modules = await ml.modulesProvider(request, soClient).listModules();
    const jobIdsToFind = new Set(jobIds);
    for (const module of modules ?? []) {
      for (const job of module.jobs) {
        if (jobIdsToFind.has(job.id) && job.config.custom_settings) {
          result.set(job.id, job.config.custom_settings as JobCustomSettings);
        }
      }
    }
  } catch (err) {
    logger.debug(
      `Failed to fetch module custom_settings: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return result;
};

export const getJobConfig = async ({
  jobIds,
  logger,
  ml,
  request,
  soClient,
}: GetJobConfigOpts): Promise<Map<string, JobConfig>> => {
  const result = new Map<string, JobConfig>();
  if (!jobIds.length) return result;

  try {
    const jobsSettled = await Promise.allSettled(
      jobIds.map((jobId) =>
        ml
          .anomalyDetectorsProvider(request, soClient)
          .jobs(jobId)
          .then((resp) => resp.jobs ?? [])
      )
    );

    const jobs = jobsSettled.flatMap((r) => {
      if (r.status === 'rejected') {
        logger.debug(
          `Failed to fetch job config: ${
            r.reason instanceof Error ? r.reason.message : String(r.reason)
          }`
        );
        return [];
      }
      return r.value;
    });

    const jobIdsMissingThreatTactics = jobs
      .filter((job) => !Array.isArray((job.custom_settings as JobCustomSettings)?.threat_tactics))
      .map((job) => job.job_id);
    const moduleCustomSettingsByJobId = await getModuleCustomSettingsByJobId({
      jobIds: jobIdsMissingThreatTactics,
      ml,
      logger,
      request,
      soClient,
    });

    for (const job of jobs) {
      const bucketSpanStr = job.analysis_config?.bucket_span;
      let bucketSpanMs = 60 * 60 * 1000; // default to 1h
      if (typeof bucketSpanStr === 'string') {
        try {
          bucketSpanMs = parseDuration(bucketSpanStr);
        } catch {
          logger.warn(`Invalid bucket_span "${bucketSpanStr}" for job ${job.job_id}`);
        }
      }

      const customSettings = (moduleCustomSettingsByJobId.get(job.job_id) ??
        job.custom_settings ??
        {}) as JobCustomSettings;
      const threatTactics = Array.isArray(customSettings.threat_tactics)
        ? customSettings.threat_tactics
        : [];

      result.set(job.job_id, {
        sourceIndex: (job.datafeed_config?.indices ?? []) as string[],
        datafeedQuery: (job.datafeed_config?.query as QueryDslQueryContainer) ?? { match_all: {} },
        detectors: job.analysis_config?.detectors ?? [],
        bucketSpanMs,
        jobName: customSettings.security_app_display_name ?? null,
        threatTactics: threatTactics.map((id) => tacticNameById.get(id) ?? id),
        threatTechniques: (customSettings.threat_techniques ?? []).map(
          (id) => techniqueNameById.get(id) ?? id
        ),
        hasThreatTactics: Array.isArray(customSettings.threat_tactics),
      });
    }
  } catch (err) {
    logger.error(`Error fetching job configs: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
};
