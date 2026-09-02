/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useLogAnalysisJobProjectRouting } from './use_log_analysis_job_project_routing';
import type { JobSummary } from './api/ml_get_jobs_summary_api';

const mockUseKibanaContextForPlugin = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => mockUseKibanaContextForPlugin(),
}));

const mockCpsEnabled = (isCpsEnabled: boolean) => {
  mockUseKibanaContextForPlugin.mockReturnValue({
    services: {
      cps: isCpsEnabled ? { isTierEligible: true, cpsManager: {} } : undefined,
    },
  });
};

const createJobSummary = (projectScopeFields: Partial<JobSummary> = {}): JobSummary => ({
  id: 'test-job',
  jobState: 'opened',
  ...projectScopeFields,
});

describe('useLogAnalysisJobProjectRouting', () => {
  it('returns the stored project routing of the job', () => {
    mockCpsEnabled(true);

    const { result } = renderHook(() =>
      useLogAnalysisJobProjectRouting(
        createJobSummary({ projectRouting: '_alias:_origin', isUiamEnabled: true })
      )
    );

    expect(result.current).toBe('_alias:_origin');
  });

  it('falls back to all projects for unscoped jobs with a cloud API key', () => {
    mockCpsEnabled(true);

    const { result } = renderHook(() =>
      useLogAnalysisJobProjectRouting(
        createJobSummary({ projectRouting: null, isUiamEnabled: true })
      )
    );

    expect(result.current).toBe('_alias:*');
  });

  it('falls back to the origin project for unscoped jobs without a cloud API key', () => {
    mockCpsEnabled(true);

    const { result } = renderHook(() =>
      useLogAnalysisJobProjectRouting(
        createJobSummary({ projectRouting: null, isUiamEnabled: false })
      )
    );

    expect(result.current).toBe('_alias:_origin');
  });

  it('returns undefined for job summaries without project scope fields', () => {
    mockCpsEnabled(true);

    const { result } = renderHook(() => useLogAnalysisJobProjectRouting(createJobSummary()));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when no job summary is available', () => {
    mockCpsEnabled(true);

    const { result } = renderHook(() => useLogAnalysisJobProjectRouting(undefined));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when CPS is unavailable', () => {
    mockCpsEnabled(false);

    const { result } = renderHook(() =>
      useLogAnalysisJobProjectRouting(
        createJobSummary({ projectRouting: '_alias:_origin', isUiamEnabled: true })
      )
    );

    expect(result.current).toBeUndefined();
  });
});
