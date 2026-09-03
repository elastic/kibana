/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import type { estypes } from '@elastic/elasticsearch';
import { useMemo } from 'react';
import type { IdFormat } from '../../../../../../common/http_api/latest';
import { logEntryCategoriesJobType } from '../../../../../../common/log_analysis';
import { useLogAnalysisModule } from '../../log_analysis_module';
import { useLogAnalysisModuleConfiguration } from '../../log_analysis_module_configuration';
import { useLogAnalysisModuleDefinition } from '../../log_analysis_module_definition';
import { useLogAnalysisJobProjectRouting } from '../../use_log_analysis_job_project_routing';
import type { ModuleSourceConfiguration } from '../../log_analysis_module_types';
import { logEntryCategoriesModule } from './module_descriptor';
import { useLogEntryCategoriesQuality } from './use_log_entry_categories_quality';

export const useLogEntryCategoriesModule = ({
  indexPattern,
  sourceId,
  spaceId,
  idFormat,
  timestampField,
  runtimeMappings,
}: {
  indexPattern: string;
  sourceId: string;
  spaceId: string;
  idFormat: IdFormat;
  timestampField: string;
  runtimeMappings: estypes.MappingRuntimeFields;
}) => {
  const sourceConfiguration: ModuleSourceConfiguration = useMemo(
    () => ({
      indices: indexPattern.split(','),
      sourceId,
      spaceId,
      timestampField,
      runtimeMappings,
    }),
    [indexPattern, sourceId, spaceId, timestampField, runtimeMappings]
  );

  const logAnalysisModule = useLogAnalysisModule({
    moduleDescriptor: logEntryCategoriesModule,
    idFormat,
    sourceConfiguration,
  });

  const { getIsJobConfigurationOutdated } = useLogAnalysisModuleConfiguration({
    sourceConfiguration,
    moduleDescriptor: logEntryCategoriesModule,
  });

  const { fetchModuleDefinition, getIsJobDefinitionOutdated } = useLogAnalysisModuleDefinition({
    sourceConfiguration,
    idFormat,
    moduleDescriptor: logEntryCategoriesModule,
  });

  const { categoryQualityWarnings } = useLogEntryCategoriesQuality({
    jobSummaries: logAnalysisModule.jobSummaries,
  });

  const hasOutdatedJobConfigurations = useMemo(
    () => logAnalysisModule.jobSummaries.some(getIsJobConfigurationOutdated),
    [getIsJobConfigurationOutdated, logAnalysisModule.jobSummaries]
  );

  const hasOutdatedJobDefinitions = useMemo(
    () => logAnalysisModule.jobSummaries.some(getIsJobDefinitionOutdated),
    [getIsJobDefinitionOutdated, logAnalysisModule.jobSummaries]
  );

  const hasStoppedJobs = useMemo(
    () =>
      Object.values(logAnalysisModule.jobStatus).some(
        (currentJobStatus) => currentJobStatus === 'stopped'
      ),
    [logAnalysisModule.jobStatus]
  );

  const projectRouting = useLogAnalysisJobProjectRouting(
    logAnalysisModule.jobSummaries.find(
      (jobSummary) => jobSummary.id === logAnalysisModule.jobIds[logEntryCategoriesJobType]
    )
  );

  return {
    ...logAnalysisModule,
    categoryQualityWarnings,
    fetchModuleDefinition,
    hasOutdatedJobConfigurations,
    hasOutdatedJobDefinitions,
    hasStoppedJobs,
    projectRouting,
  };
};

export const [LogEntryCategoriesModuleProvider, useLogEntryCategoriesModuleContext] =
  createContainer(useLogEntryCategoriesModule);
