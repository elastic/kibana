/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { installationStatuses, useGetDataStreams } from '@kbn/fleet-plugin/public';
import { useIntegrationsLastActivity } from './use_integrations_last_activity';
import type { PackageListItem } from '@kbn/fleet-plugin/common';

jest.mock('@kbn/fleet-plugin/public');

const oldestLastActivity = 1735711200000;
const newestLastActivity = oldestLastActivity + 1000;

const packages: PackageListItem[] = [
  {
    id: 'splunk',
    name: 'splunk',
    icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
    status: installationStatuses.Installed,
    title: 'Splunk',
    version: '',
  },
  {
    id: 'google_secops',
    name: 'google_secops',
    icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
    status: installationStatuses.Installed,
    title: 'Google SecOps',
    version: '',
  },
];

describe('useIntegrationsLastActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return isLoading true', () => {
    (useGetDataStreams as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useIntegrationsLastActivity({ packages }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.lastActivities).toEqual({});
  });

  it('should return an object with package name and last sync values', () => {
    (useGetDataStreams as jest.Mock).mockReturnValue({
      data: {
        data_streams: [{ package: 'splunk', last_activity_ms: oldestLastActivity }],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useIntegrationsLastActivity({ packages }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastActivities.splunk).toBe(oldestLastActivity);
  });

  it('should return most recent value for integration matching multiple dataStreams', () => {
    (useGetDataStreams as jest.Mock).mockReturnValue({
      data: {
        data_streams: [
          { package: 'splunk', last_activity_ms: oldestLastActivity },
          { package: 'splunk', last_activity_ms: newestLastActivity },
          { package: 'google_secops', last_activity_ms: oldestLastActivity },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useIntegrationsLastActivity({ packages }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastActivities.splunk).toBe(newestLastActivity);
    expect(result.current.lastActivities.google_secops).toBe(oldestLastActivity);
  });
});
