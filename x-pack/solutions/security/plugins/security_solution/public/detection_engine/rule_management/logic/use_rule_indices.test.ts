/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useRuleIndices } from './use_rule_indices';
import { useGetInstalledJob } from '../../../common/components/ml/hooks/use_get_jobs';
import { useSecurityJobs } from '../../../common/components/ml_popover/hooks/use_security_jobs';

jest.mock('../../../common/components/ml/hooks/use_get_jobs');
jest.mock('../../../common/components/ml_popover/hooks/use_security_jobs');

describe('useRuleIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return handle undefined parameters', async () => {
    (useSecurityJobs as jest.Mock).mockImplementation(() => ({
      jobs: [{ id: 'job1' }, { id: 'job2' }],
      loading: false,
    }));
    (useGetInstalledJob as jest.Mock).mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual([]);
      return { loading: false, jobs: [] };
    });
    const { result } = renderHook(() => useRuleIndices());
    expect(result.current).toEqual({
      mlJobLoading: false,
      ruleIndices: [],
    });
  });

  it('should return default indices if ML job is not specified', async () => {
    (useSecurityJobs as jest.Mock).mockImplementation(() => ({
      jobs: [{ id: 'job1' }, { id: 'job2' }],
      loading: false,
    }));
    (useGetInstalledJob as jest.Mock).mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual([]);
      return { loading: false, jobs: [] };
    });
    const defaultIndices = ['index1', 'index2'];
    const { result } = renderHook(() => useRuleIndices(undefined, defaultIndices));
    expect(result.current).toEqual({
      mlJobLoading: false,
      ruleIndices: defaultIndices,
    });
  });

  it('should return default indices if ML job is not specified 1', async () => {
    const machineLearningJobId = ['ml-job-1', 'ml-job-2'];
    (useSecurityJobs as jest.Mock).mockImplementation(() => ({
      jobs: [
        { id: 'ml-job-1', isInstalled: true },
        { id: 'ml-job-2', isInstalled: true },
      ],
      loading: false,
    }));
    (useGetInstalledJob as jest.Mock).mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual(machineLearningJobId);
      return {
        loading: false,
        jobs: [{ results_index_name: 'index1' }, { results_index_name: 'index2' }],
      };
    });
    const defaultIndices = ['index1', 'index2'];
    const { result } = renderHook(() => useRuleIndices(machineLearningJobId, defaultIndices));
    expect(result.current).toEqual({
      mlJobLoading: false,
      ruleIndices: ['.ml-anomalies-index1', '.ml-anomalies-index2'],
    });
  });

  it('should return indices of installed jobs only', async () => {
    const machineLearningJobId = ['ml-job-1', 'ml-job-2'];
    (useSecurityJobs as jest.Mock).mockImplementation(() => ({
      jobs: [
        { id: 'ml-job-1', isInstalled: false },
        { id: 'ml-job-2', isInstalled: true },
      ],
      loading: false,
    }));
    (useGetInstalledJob as jest.Mock).mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual(['ml-job-2']);
      return {
        loading: false,
        jobs: [{ results_index_name: 'index2' }],
      };
    });
    const defaultIndices = ['index1', 'index2'];
    const { result } = renderHook(() => useRuleIndices(machineLearningJobId, defaultIndices));
    expect(result.current).toEqual({
      mlJobLoading: false,
      ruleIndices: ['.ml-anomalies-index2'],
    });
  });

  it('should return default indices if ML jobs are not installed', async () => {
    const machineLearningJobId = ['ml-job-1', 'ml-job-2'];
    (useSecurityJobs as jest.Mock).mockImplementation(() => ({
      jobs: [
        { id: 'ml-job-1', isInstalled: false },
        { id: 'ml-job-2', isInstalled: false },
      ],
      loading: false,
    }));
    (useGetInstalledJob as jest.Mock).mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual([]);
      return {
        loading: false,
        jobs: [],
      };
    });
    const defaultIndices = ['index1', 'index2'];
    const { result } = renderHook(() => useRuleIndices(machineLearningJobId, defaultIndices));
    expect(result.current).toEqual({
      mlJobLoading: false,
      ruleIndices: defaultIndices,
    });
  });
});
