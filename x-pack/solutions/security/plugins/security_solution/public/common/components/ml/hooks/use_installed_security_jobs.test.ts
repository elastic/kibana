/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';

import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { isSecurityJob } from '../../../../../common/machine_learning/is_security_job';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useAppToastsMock } from '../../../hooks/use_app_toasts.mock';
import { mockJobsSummaryResponse } from '../../ml_popover/api.mock';
import { getJobsSummary } from '../api/get_jobs_summary';
import { useInstalledSecurityJobs } from './use_installed_security_jobs';
import { TestProviders } from '../../../mock';

vi.mock('../../../../../common/machine_learning/has_ml_user_permissions');
vi.mock('../../../../../common/machine_learning/has_ml_license');
vi.mock('../../../hooks/use_app_toasts');
vi.mock('../api/get_jobs_summary');

describe('useInstalledSecurityJobs', () => {
  let appToastsMock: Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as Mock).mockReturnValue(appToastsMock);
    (getJobsSummary as Mock).mockResolvedValue(mockJobsSummaryResponse);
  });

  describe('when the user has permissions', () => {
    beforeEach(() => {
      (hasMlUserPermissions as Mock).mockReturnValue(true);
      (hasMlLicense as Mock).mockReturnValue(true);
    });

    it('returns jobs and permissions', async () => {
      const { result } = renderHook(() => useInstalledSecurityJobs(), {
        wrapper: TestProviders,
      });

      await waitFor(() => expect(result.current.jobs).toHaveLength(3));

      expect(result.current.jobs).toEqual(
        expect.arrayContaining([
          {
            awaitingNodeAssignment: false,
            datafeedId: 'datafeed-siem-api-rare_process_linux_ecs',
            datafeedIndices: ['auditbeat-*'],
            datafeedState: 'stopped',
            description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
            earliestTimestampMs: 1557353420495,
            groups: ['siem'],
            hasDatafeed: true,
            id: 'siem-api-rare_process_linux_ecs',
            isSingleMetricViewerJob: true,
            jobState: 'closed',
            jobTags: {},
            latestTimestampMs: 1557434782207,
            memory_status: 'hard_limit',
            processed_record_count: 582251,
            bucketSpanSeconds: 900,
          },
        ])
      );
      expect(result.current.isMlUser).toEqual(true);
      expect(result.current.isLicensed).toEqual(true);
    });

    it('filters out non-security jobs', async () => {
      const { result } = renderHook(() => useInstalledSecurityJobs(), {
        wrapper: TestProviders,
      });
      await waitFor(() => expect(result.current.jobs.length).toBeGreaterThan(0));

      expect(result.current.jobs.every(isSecurityJob)).toEqual(true);
    });

    it('renders a toast error if the ML call fails', async () => {
      (getJobsSummary as Mock).mockRejectedValue('whoops');

      renderHook(() => useInstalledSecurityJobs(), {
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
      (hasMlUserPermissions as Mock).mockReturnValue(false);
      (hasMlLicense as Mock).mockReturnValue(false);
    });

    it('returns empty jobs and false predicates', () => {
      const { result } = renderHook(() => useInstalledSecurityJobs(), {
        wrapper: TestProviders,
      });

      expect(result.current.jobs).toEqual([]);
      expect(result.current.isMlUser).toEqual(false);
      expect(result.current.isLicensed).toEqual(false);
    });
  });
});
