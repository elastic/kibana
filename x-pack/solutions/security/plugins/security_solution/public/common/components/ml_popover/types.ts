/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { MlError } from '../ml/types';

export interface Group {
  id: string;
  jobIds: string[];
  calendarIds: string[];
}

export interface CheckRecognizerProps {
  indexPatternName: string[];
  signal?: AbortSignal;
}

export interface RecognizerModule {
  id: string;
  title: string;
  query: Record<string, object>;
  description: string;
  logo: {
    icon: string;
  };
}

export interface GetModulesProps {
  moduleId?: string;
  /** When set, limits modules to those matching the tag (e.g. `security`). Omit for all modules. */
  filter?: string;
  signal?: AbortSignal;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  type: string;
  /** Present on file-based (stack) modules; omitted on Fleet `ml-module` saved objects. */
  logoFile?: string;
  /** Present on Fleet `ml-module` saved objects (e.g. `{ icon: 'logoNginx' }`). */
  logo?: {
    icon: string;
  };
  defaultIndexPattern: string;
  query: Record<string, object>;
  jobs: ModuleJob[];
  datafeeds: ModuleDatafeed[];
  kibana: object;
}

/**
 * Representation of an ML Job as returned from `the ml/modules/get_module` API
 */
export interface ModuleJob {
  id: string;
  config: {
    groups: string[];
    description: string;
    analysis_config: {
      bucket_span: string;
      summary_count_field_name?: string;
      detectors: Detector[];
      influencers: string[];
    };
    analysis_limits: {
      model_memory_limit: string;
    };
    data_description: {
      time_field: string;
      time_format?: string;
    };
    model_plot_config?: {
      enabled: boolean;
    };
    custom_settings: {
      created_by: string;
      custom_urls: CustomURL[];
      security_app_display_name?: string;
      /** Incremented when the packaged job definition changes. */
      job_revision?: number;
      managed?: boolean;
    };
    job_type: string;
  };
}

// TODO: Speak to ML team about why the get_module API will sometimes return indexes and other times indices
// See mockGetModuleResponse for examples
export interface ModuleDatafeed {
  id: string;
  config: {
    job_id: string;
    indexes?: string[];
    indices?: string[];
    query: Record<string, object>;
  };
}

export interface MlSetupArgs {
  configTemplate: string;
  indexPatternName: string;
  jobIdErrorFilter: string[];
  groups: string[];
  prefix?: string;
}

export interface Detector {
  detector_description: string;
  function: string;
  by_field_name: string;
  partition_field_name?: string;
}

export interface CustomURL {
  url_name: string;
  url_value: string;
}

/**
 * Representation of an ML Job as used by the Security Solution App -- a composition of ModuleJob and MlSummaryJob
 * that includes necessary metadata like moduleName, defaultIndexPattern, etc.
 */
export interface SecurityJob extends MlSummaryJob {
  moduleId: string;
  defaultIndexPattern: string;
  isCompatible: boolean;
  isInstalled: boolean;
  isElasticJob: boolean;
  /** Job comes from a Fleet package `ml-module` saved object. */
  isIntegrationJob?: boolean;
  /** Packaged `custom_settings.job_revision` from get_module / Fleet ml-module. */
  packagedJobRevision?: number;
  /** Installed job's `customSettings.job_revision` from jobs_summary. */
  installedJobRevision?: number;
  /** True when packaged revision is newer than the installed job. */
  isUpdateAvailable?: boolean;
  customSettings?: {
    security_app_display_name?: string;
    job_revision?: number;
    created_by?: string;
    managed?: boolean;
  };
}

export interface AugmentedSecurityJobFields {
  moduleId: string;
  defaultIndexPattern: string;
  isCompatible: boolean;
  isElasticJob: boolean;
  isIntegrationJob?: boolean;
  packagedJobRevision?: number;
}

export interface SetupMlResponseJob {
  id: string;
  success: boolean;
  error?: MlError;
}

export interface SetupMlResponseDatafeed {
  id: string;
  success: boolean;
  started: boolean;
  error?: MlError;
}

export interface SetupMlResponse {
  jobs: SetupMlResponseJob[];
  datafeeds: SetupMlResponseDatafeed[];
  kibana: {};
}

export interface StartDatafeedResponse {
  [key: string]: {
    started: boolean;
    error?: string;
  };
}

export interface ErrorResponse {
  statusCode?: number;
  error?: string;
  message?: string;
}

export interface StopDatafeedResponse {
  [key: string]: {
    stopped: boolean;
  };
}

export interface CloseJobsResponse {
  [key: string]: {
    closed: boolean;
  };
}

export type MlJobsTab = 'prebuilt' | 'integration';

export interface JobsFilters {
  filterQuery: string;
  showCustomJobs: boolean;
  showElasticJobs: boolean;
  selectedGroups: string[];
  selectedTab: MlJobsTab;
}
