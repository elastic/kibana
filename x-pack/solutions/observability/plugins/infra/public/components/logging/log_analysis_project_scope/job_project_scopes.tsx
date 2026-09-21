/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useShouldRenderInfraMlCpsUi } from '../../../hooks/use_infra_ml_cps';
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

/**
 * Shows which projects each of a page's ML jobs analyzes. The project picker is readonly on the
 * Logs ML pages because scope is a per-job property, so this is how that scope stays visible.
 */
export const JobProjectScopes: FC<JobProjectScopesProps> = ({ jobs }) => {
  const {
    services: { cps },
  } = useKibanaContextForPlugin();
  const cpsManager = cps?.cpsManager;
  const shouldRenderCpsUi = useShouldRenderInfraMlCpsUi();

  const scopedJobs = jobs.filter(
    (job): job is JobProjectScopeItem & { projectRouting: NonNullable<ProjectRouting> } =>
      job.projectRouting !== undefined
  );

  // A pending `undefined` reading still renders, letting the buttons show that they are loading.
  // A renderable reading implies `cpsManager` exists; the explicit check only narrows its type.
  if (shouldRenderCpsUi === false || !cpsManager || scopedJobs.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {scopedJobs.map(({ name, projectRouting }) => (
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
