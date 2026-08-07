/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import { isSecurityJob } from '../../../../../common/machine_learning/is_security_job';
import type {
  AugmentedSecurityJobFields,
  Module,
  ModuleJob,
  RecognizerModule,
  SecurityJob,
} from '../types';
import { mlModules } from '../ml_modules';

/**
 * True when the installed job's revision is behind the packaged definition.
 * Works for OOTB Kibana modules and Fleet `ml-module` jobs that ship `job_revision`.
 */
export const isJobUpdateAvailable = (
  installedJobRevision: number | undefined,
  packagedJobRevision: number | undefined
): boolean =>
  packagedJobRevision != null && (installedJobRevision ?? 0) < packagedJobRevision;

/**
 * Helper function for converting from ModuleJob -> SecurityJob
 * @param module
 * @param moduleJob
 * @param isCompatible
 * @param fleetModuleIds module ids installed via Fleet `ml-module` saved objects
 */
export const moduleToSecurityJob = (
  module: Module,
  moduleJob: ModuleJob,
  isCompatible: boolean,
  fleetModuleIds: Set<string> = new Set()
): SecurityJob => {
  const isElasticJob = mlModules.includes(module.id);
  const packagedJobRevision = moduleJob.config.custom_settings?.job_revision;

  return {
    datafeedId: '',
    datafeedIndices: [],
    datafeedState: '',
    hasDatafeed: false,
    isSingleMetricViewerJob: false,
    jobState: 'closed',
    memory_status: '',
    processed_record_count: 0,
    id: moduleJob.id,
    description: moduleJob.config.description,
    groups: [...moduleJob.config.groups].sort(),
    defaultIndexPattern: module.defaultIndexPattern,
    moduleId: module.id,
    isCompatible,
    isInstalled: false,
    isElasticJob,
    isIntegrationJob: fleetModuleIds.has(module.id),
    awaitingNodeAssignment: false,
    jobTags: {},
    bucketSpanSeconds: 900,
    customSettings: moduleJob.config.custom_settings,
    packagedJobRevision,
    installedJobRevision: undefined,
    isUpdateAvailable: false,
  };
};

/**
 * Returns fields necessary to augment a ModuleJob to a SecurityJob
 *
 * @param jobId
 * @param moduleJobs
 * @param compatibleModuleIds
 */
export const getAugmentedFields = (
  jobId: string,
  moduleJobs: SecurityJob[],
  compatibleModuleIds: string[]
): AugmentedSecurityJobFields => {
  const moduleJob = moduleJobs.find((mj) => mj.id === jobId);
  return moduleJob !== undefined
    ? {
        moduleId: moduleJob.moduleId,
        defaultIndexPattern: moduleJob.defaultIndexPattern,
        isCompatible: compatibleModuleIds.includes(moduleJob.moduleId),
        isElasticJob: moduleJob.isElasticJob,
        isIntegrationJob: moduleJob.isIntegrationJob,
        packagedJobRevision: moduleJob.packagedJobRevision,
      }
    : {
        moduleId: '',
        defaultIndexPattern: '',
        isCompatible: true,
        isElasticJob: false,
        isIntegrationJob: false,
      };
};

/**
 * Process Modules[] from the `get_module` ML API into SecurityJobs[] by filtering to Security specific
 * modules and unpacking jobs from each module
 *
 * @param modulesData
 * @param compatibleModuleIds
 */
export const getModuleJobs = (
  modulesData: Module[],
  compatibleModuleIds: string[],
  fleetModuleIds: Set<string> = new Set()
): SecurityJob[] =>
  modulesData
    .filter((module) => mlModules.includes(module.id))
    .map((module) => [
      ...module.jobs.map((moduleJob) =>
        moduleToSecurityJob(
          module,
          moduleJob,
          compatibleModuleIds.includes(module.id),
          fleetModuleIds
        )
      ),
    ])
    .flat();

/**
 * Process Modules[] into SecurityJobs[] for Fleet integration-packaged ML modules
 * (`ml-module` saved objects installed with Fleet packages).
 */
export const getIntegrationModuleJobs = (
  modulesData: Module[],
  compatibleModuleIds: string[],
  fleetModuleIds: Set<string>
): SecurityJob[] =>
  modulesData
    .filter((module) => fleetModuleIds.has(module.id))
    .map((module) => [
      ...module.jobs.map((moduleJob) =>
        moduleToSecurityJob(
          module,
          moduleJob,
          compatibleModuleIds.includes(module.id),
          fleetModuleIds
        )
      ),
    ])
    .flat();

/**
 * Process data from the `jobs_summary` ML API into SecurityJobs[] by filtering to Security jobs
 * and augmenting with moduleId/defaultIndexPattern/isCompatible
 *
 * @param jobSummaryData
 * @param moduleJobs
 * @param compatibleModuleIds
 */
export const getInstalledJobs = (
  jobSummaryData: MlSummaryJob[],
  moduleJobs: SecurityJob[],
  compatibleModuleIds: string[]
): SecurityJob[] =>
  jobSummaryData.filter(isSecurityJob).map((jobSummary) => {
    const augmented = getAugmentedFields(jobSummary.id, moduleJobs, compatibleModuleIds);
    const installedJobRevision = jobSummary.customSettings?.job_revision as number | undefined;
    const packagedJobRevision = augmented.packagedJobRevision;

    return {
      ...jobSummary,
      ...augmented,
      isInstalled: true,
      installedJobRevision,
      packagedJobRevision,
      isUpdateAvailable: isJobUpdateAvailable(installedJobRevision, packagedJobRevision),
    };
  });

/**
 * Installed jobs that belong to the given module job list (any ML group), used for
 * Fleet integration modules outside the Security group.
 */
export const getInstalledJobsForModules = (
  jobSummaryData: MlSummaryJob[],
  moduleJobs: SecurityJob[],
  compatibleModuleIds: string[]
): SecurityJob[] => {
  const moduleJobIds = new Set(moduleJobs.map((job) => job.id));

  return jobSummaryData
    .filter((jobSummary) => moduleJobIds.has(jobSummary.id))
    .map((jobSummary) => {
      const augmented = getAugmentedFields(jobSummary.id, moduleJobs, compatibleModuleIds);
      const installedJobRevision = jobSummary.customSettings?.job_revision as number | undefined;
      const packagedJobRevision =
        augmented.packagedJobRevision ??
        moduleJobs.find((job) => job.id === jobSummary.id)?.packagedJobRevision;

      return {
        ...jobSummary,
        ...augmented,
        isInstalled: true,
        installedJobRevision,
        packagedJobRevision,
        isUpdateAvailable: isJobUpdateAvailable(installedJobRevision, packagedJobRevision),
      };
    });
};

/**
 * Combines installed jobs + moduleSecurityJobs that don't overlap and sorts by name asc
 *
 * @param installedJobs
 * @param moduleSecurityJobs
 */
export const composeModuleAndInstalledJobs = (
  installedJobs: SecurityJob[],
  moduleSecurityJobs: SecurityJob[]
): SecurityJob[] => {
  const installedJobsIds = installedJobs.map((installedJob) => installedJob.id);

  return [
    ...installedJobs,
    ...moduleSecurityJobs.filter((mj) => !installedJobsIds.includes(mj.id)),
  ].sort((a, b) => a.id.localeCompare(b.id));
};

export interface SecurityJobsBySource {
  jobs: SecurityJob[];
  integrationJobs: SecurityJob[];
}

/**
 * Creates SecurityJobs split by source: SIEM pre-built/custom jobs vs Fleet
 * integration-packaged ML modules (`ml-module` saved objects).
 */
export const createSecurityJobsBySource = (
  jobSummaryData: MlSummaryJob[],
  modulesData: Module[],
  compatibleModules: RecognizerModule[],
  fleetModules: Module[] = []
): SecurityJobsBySource => {
  const compatibleModuleIds = compatibleModules.map((module) => module.id);
  const fleetModuleIds = new Set(fleetModules.map((module) => module.id));

  // Prefer get_module payloads (same job shape as pre-built); fall back to SO attributes
  // when a Fleet module is not yet present in the recognizer response.
  const modulesById = new Map(modulesData.map((module) => [module.id, module]));
  for (const fleetModule of fleetModules) {
    if (!modulesById.has(fleetModule.id)) {
      modulesById.set(fleetModule.id, fleetModule);
    }
  }
  const modulesWithFleet = [...modulesById.values()];

  const prebuiltModuleJobs = getModuleJobs(modulesWithFleet, compatibleModuleIds, fleetModuleIds);
  const integrationModuleJobs = getIntegrationModuleJobs(
    modulesWithFleet,
    compatibleModuleIds,
    fleetModuleIds
  );
  const allModuleJobs = [...prebuiltModuleJobs, ...integrationModuleJobs];

  const securityGroupInstalledJobs = getInstalledJobs(
    jobSummaryData,
    allModuleJobs,
    compatibleModuleIds
  );

  const integrationModuleIdSet = new Set(integrationModuleJobs.map((job) => job.moduleId));
  const prebuiltInstalledJobs = securityGroupInstalledJobs.filter(
    (job) => !integrationModuleIdSet.has(job.moduleId)
  );
  const integrationInstalledJobs = getInstalledJobsForModules(
    jobSummaryData,
    integrationModuleJobs,
    compatibleModuleIds
  );

  return {
    jobs: composeModuleAndInstalledJobs(prebuiltInstalledJobs, prebuiltModuleJobs),
    integrationJobs: composeModuleAndInstalledJobs(integrationInstalledJobs, integrationModuleJobs),
  };
};

/**
 * Creates a list of SecurityJobs by composing jobs summaries (installed jobs) and Module
 * jobs (pre-packaged Security jobs) into a single job object that can be used throughout the Security app
 *
 * @param jobSummaryData
 * @param modulesData
 * @param compatibleModules
 */
export const createSecurityJobs = (
  jobSummaryData: MlSummaryJob[],
  modulesData: Module[],
  compatibleModules: RecognizerModule[],
  fleetModules: Module[] = []
): SecurityJob[] =>
  createSecurityJobsBySource(jobSummaryData, modulesData, compatibleModules, fleetModules).jobs;
