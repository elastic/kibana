/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFetchIntegrations } from './use_fetch_integrations';
import { useKibana } from '../../../common/lib/kibana';
import {
  installationStatuses,
  useGetPackagesQuery,
  useGetSettingsQuery,
} from '@kbn/fleet-plugin/public';

jest.mock('../../../common/lib/kibana');
jest.mock('@kbn/fleet-plugin/public');

describe('useFetchIntegrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return isLoading true', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        fleet: {
          authz: {
            fleet: {
              readSettings: true,
            },
          },
        },
      },
    });
    (useGetSettingsQuery as jest.Mock).mockReturnValue({
      isFetchedAfterMount: true,
    });
    (useGetPackagesQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
    });

    const { result } = renderHook(() => useFetchIntegrations());

    expect(result.current.availablePackage).toHaveLength(0);
    expect(result.current.installedPackages).toHaveLength(0);
    expect(result.current.isLoading).toBe(true);
  });

  it('should return availablePackage and installedPackages', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        fleet: {
          authz: {
            fleet: {
              readSettings: true,
            },
          },
        },
      },
    });
    (useGetSettingsQuery as jest.Mock).mockReturnValue({
      isFetchedAfterMount: true,
    });
    (useGetPackagesQuery as jest.Mock).mockReturnValue({
      data: {
        items: [
          {
            name: 'splunk',
            status: installationStatuses.Installed,
          },
          {
            name: 'google_secops',
            status: installationStatuses.InstallFailed,
          },
          {
            name: 'microsoft_sentinel',
            status: installationStatuses.NotInstalled,
          },
          { name: 'unknown' },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useFetchIntegrations());

    expect(result.current.availablePackage).toHaveLength(1);
    expect(result.current.availablePackage[0].name).toBe('microsoft_sentinel');

    expect(result.current.installedPackages).toHaveLength(2);
    expect(result.current.installedPackages[0].name).toBe('splunk');
    expect(result.current.installedPackages[1].name).toBe('google_secops');

    expect(result.current.isLoading).toBe(false);
  });
});
