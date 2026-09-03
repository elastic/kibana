/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import { type ICPSManager, useIsCpsMultiProject } from '@kbn/cps-utils';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { JobProjectScopeButton } from './job_project_scope_button';

export interface JobProjectScopeItem {
  /** Identifies the job when a page describes more than one; omitted when there is only one. */
  name?: string;
  /**
   * The job's effective project scope, as resolved by `useLogAnalysisJobProjectRouting`. Jobs
   * without one are left out, which is how a job that has not been set up is skipped.
   */
  projectRouting: ProjectRouting | undefined;
}

export interface JobProjectScopesProps {
  jobs: JobProjectScopeItem[];
}

interface JobProjectScopesInnerProps {
  cpsManager: ICPSManager;
  jobs: Array<JobProjectScopeItem & { projectRouting: NonNullable<ProjectRouting> }>;
}

const JobProjectScopesInner: FC<JobProjectScopesInnerProps> = ({ cpsManager, jobs }) => {
  const isCpsMultiProject = useIsCpsMultiProject(cpsManager);

  // Without linked projects every job covers the same single project, so the scope says nothing.
  // A pending reading still renders, letting the buttons show that they are loading.
  if (isCpsMultiProject === false) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {jobs.map(({ name, projectRouting }) => (
        <EuiFlexItem grow={false} key={name ?? projectRouting}>
          <JobProjectScopeButton
            cpsManager={cpsManager}
            name={name}
            projectRouting={projectRouting}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

/**
 * Shows which projects each of a page's ML jobs analyzes. The project picker is disabled on the
 * Logs ML pages because scope is a per-job property, so this is how that scope stays visible.
 */
export const JobProjectScopes: FC<JobProjectScopesProps> = ({ jobs }) => {
  const {
    services: { cps },
  } = useKibanaContextForPlugin();
  const cpsManager = cps?.cpsManager;

  const scopedJobs = jobs.filter(
    (job): job is JobProjectScopeItem & { projectRouting: NonNullable<ProjectRouting> } =>
      job.projectRouting !== undefined
  );

  if (!cps?.isTierEligible || !cpsManager || scopedJobs.length === 0) {
    return null;
  }

  return <JobProjectScopesInner cpsManager={cpsManager} jobs={scopedJobs} />;
};
