/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useAppToastsMock } from '../../../hooks/use_app_toasts.mock';
import { TestProviders } from '../../../mock';
import { getJobsSummary } from '../../ml/api/get_jobs_summary';
import { checkRecognizer, getModules } from '../api';
import {
  checkRecognizerSuccess,
  mockGetModuleResponse,
  mockJobsSummaryResponse,
} from '../api.mock';
import type { SecurityJob } from '../types';
import { useSecurityJobs } from './use_security_jobs';

vi.mock('../../../../../common/machine_learning/has_ml_admin_permissions');
vi.mock('../../../../../common/machine_learning/has_ml_license');
vi.mock('../../../lib/kibana');
vi.mock('../../../hooks/use_app_toasts');
vi.mock('../../ml/hooks/use_ml_capabilities');
vi.mock('../../ml/api/get_jobs_summary');
vi.mock('../api');

describe('useSecurityJobs', () => {
  let appToastsMock: Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as Mock).mockReturnValue(appToastsMock);
  });

  describe('when user has valid permissions', () => {
    beforeEach(() => {
      (hasMlAdminPermissions as Mock).mockReturnValue(true);
      (hasMlLicense as Mock).mockReturnValue(true);
      (getJobsSummary as Mock).mockResolvedValue(mockJobsSummaryResponse);
      (getModules as Mock).mockResolvedValue(mockGetModuleResponse);
      (checkRecognizer as Mock).mockResolvedValue(checkRecognizerSuccess);
    });

    it('combines multiple ML calls into an array of SecurityJobs', async () => {
      const expectedSecurityJob: SecurityJob = {
        datafeedId: 'datafeed-siem-api-rare_process_linux_ecs',
        datafeedIndices: ['auditbeat-*'],
        datafeedState: 'stopped',
        defaultIndexPattern: '',
        description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
        earliestTimestampMs: 1557353420495,
        groups: ['siem'],
        hasDatafeed: true,
        id: 'siem-api-rare_process_linux_ecs',
        isCompatible: true,
        isElasticJob: false,
        isInstalled: true,
        isSingleMetricViewerJob: true,
        jobState: 'closed',
        jobTags: {},
        latestTimestampMs: 1557434782207,
        memory_status: 'hard_limit',
        moduleId: '',
        processed_record_count: 582251,
        awaitingNodeAssignment: false,
        bucketSpanSeconds: 900,
      };

      const { result } = renderHook(() => useSecurityJobs(), {
        wrapper: TestProviders,
      });
      await waitFor(() => expect(result.current.jobs).toHaveLength(6));
      expect(result.current.jobs).toEqual(expect.arrayContaining([expectedSecurityJob]));
    });

    it('returns those permissions', async () => {
      const { result } = renderHook(() => useSecurityJobs(), {
        wrapper: TestProviders,
      });
      await waitFor(() => {
        expect(result.current.isMlAdmin).toEqual(true);
        expect(result.current.isLicensed).toEqual(true);
      });
    });

    it('renders a toast error if an ML call fails', async () => {
      (getModules as Mock).mockRejectedValue('whoops');
      renderHook(() => useSecurityJobs(), {
        wrapper: TestProviders,
      });

      // addError might be called after an arbitrary number of renders, so we
      // need to use waitFor here instead of waitFor
      await waitFor(() => {
        expect(appToastsMock.addError).toHaveBeenCalledWith('whoops', {
          title: 'Security job fetch failure',
        });
      });
    });
  });

  describe('when the user does not have valid permissions', () => {
    beforeEach(() => {
      (hasMlAdminPermissions as Mock).mockReturnValue(false);
      (hasMlLicense as Mock).mockReturnValue(false);
    });

    it('returns empty jobs and false predicates', () => {
      const { result } = renderHook(() => useSecurityJobs(), {
        wrapper: TestProviders,
      });

      expect(result.current.jobs).toEqual([]);
      expect(result.current.isMlAdmin).toEqual(false);
      expect(result.current.isLicensed).toEqual(false);
    });
  });
});
