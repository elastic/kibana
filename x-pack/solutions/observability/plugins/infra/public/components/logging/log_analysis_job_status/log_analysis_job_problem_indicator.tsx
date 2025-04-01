/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { JobConfigurationOutdatedCallout } from './job_configuration_outdated_callout';
import { JobDefinitionOutdatedCallout } from './job_definition_outdated_callout';
import { JobStoppedCallout } from './job_stopped_callout';
import { FirstUseCallout } from '../log_analysis_results';

export const LogAnalysisJobProblemIndicator: React.FC<{
  hasOutdatedJobConfigurations: boolean;
  hasOutdatedJobDefinitions: boolean;
  hasSetupCapabilities: boolean;
  hasStoppedJobs: boolean;
  isFirstUse: boolean;
  moduleName: string;
  onRecreateMlJobForReconfiguration: () => void;
  onRecreateMlJobForUpdate: () => void;
}> = ({
  hasOutdatedJobConfigurations,
  hasOutdatedJobDefinitions,
  hasSetupCapabilities,
  hasStoppedJobs,
  isFirstUse,
  moduleName,
  onRecreateMlJobForReconfiguration,
  onRecreateMlJobForUpdate,
}) => {
  return (
    <>
      {hasOutdatedJobDefinitions ? (
        <JobDefinitionOutdatedCallout
          hasSetupCapabilities={hasSetupCapabilities}
          moduleName={moduleName}
          onRecreateMlJob={onRecreateMlJobForUpdate}
        />
      ) : null}
      {hasOutdatedJobConfigurations ? (
        <JobConfigurationOutdatedCallout
          hasSetupCapabilities={hasSetupCapabilities}
          moduleName={moduleName}
          onRecreateMlJob={onRecreateMlJobForReconfiguration}
        />
      ) : null}
      {hasStoppedJobs ? <JobStoppedCallout /> : null}
      {isFirstUse ? <FirstUseCallout /> : null}
    </>
  );
};
