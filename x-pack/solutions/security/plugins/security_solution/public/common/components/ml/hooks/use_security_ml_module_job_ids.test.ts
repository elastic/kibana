/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

import type { Module, ModuleJob } from '../../ml_popover/types';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useAppToastsMock } from '../../../hooks/use_app_toasts.mock';
import { getAllMlModules } from '../api/get_all_ml_modules';
import { useSecurityMlModuleJobIds } from './use_security_ml_module_job_ids';
import { TestProviders } from '../../../mock';

jest.mock('../../../../../common/machine_learning/has_ml_user_permissions');
jest.mock('../../../../../common/machine_learning/has_ml_license');
jest.mock('../../../hooks/use_app_toasts');
jest.mock('../api/get_all_ml_modules');

const buildJob = (id: string, groups: string[]): ModuleJob => ({
  id,
  config: {
    groups,
    description: '',
    analysis_config: { bucket_span: '15m', detectors: [], influencers: [] },
    analysis_limits: { model_memory_limit: '256mb' },
    data_description: { time_field: '@timestamp' },
    custom_settings: { created_by: 'test', custom_urls: [] },
    job_type: 'anomaly_detector',
  },
});

const buildModule = (id: string, jobs: ModuleJob[]): Module => ({
  id,
  title: id,
  description: '',
  type: '',
  logoFile: '',
  defaultIndexPattern: '',
  query: {},
  jobs,
  datafeeds: [],
  kibana: {},
});

describe('useSecurityMlModuleJobIds', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  describe('when the user has permissions', () => {
    beforeEach(() => {
      (hasMlUserPermissions as jest.Mock).mockReturnValue(true);
      (hasMlLicense as jest.Mock).mockReturnValue(true);
    });

    it('returns the job ids of jobs in the security/siem ML groups across all modules', async () => {
      (getAllMlModules as jest.Mock).mockResolvedValue([
        buildModule('module-1', [
          buildJob('security-job', ['security']),
          buildJob('other-job', ['other']),
        ]),
        buildModule('module-2', [buildJob('siem-job', ['siem', 'auditbeat'])]),
      ]);

      const { result } = renderHook(() => useSecurityMlModuleJobIds(), {
        wrapper: TestProviders,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.jobIds).toEqual(['security-job', 'siem-job']);
    });

    it('renders a toast error if the ML call fails', async () => {
      (getAllMlModules as jest.Mock).mockRejectedValue('whoops');

      renderHook(() => useSecurityMlModuleJobIds(), {
        wrapper: TestProviders,
      });

      await waitFor(() =>
        expect(appToastsMock.addError).toHaveBeenCalledWith('whoops', {
          title: 'Security job fetch failure',
        })
      );
    });
  });

  describe('when the user does not have valid permissions', () => {
    beforeEach(() => {
      (hasMlUserPermissions as jest.Mock).mockReturnValue(false);
      (hasMlLicense as jest.Mock).mockReturnValue(false);
    });

    it('does not fetch modules and returns an empty job list', () => {
      const { result } = renderHook(() => useSecurityMlModuleJobIds(), {
        wrapper: TestProviders,
      });

      expect(getAllMlModules).not.toHaveBeenCalled();
      expect(result.current.jobIds).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });
});
