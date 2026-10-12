/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getMonitorSpaceToAppend, useEditMonitorLocator } from './use_edit_monitor_locator';

jest.mock('@kbn/kibana-react-plugin/public');

describe('getMonitorSpaceToAppend', () => {
  it('targets the monitor space when it is not the active space', () => {
    expect(getMonitorSpaceToAppend('fleet-admin', ['default', 'team-a'])).toEqual({
      spaceId: 'default',
    });
  });

  it('stays in the active space when the monitor is visible there', () => {
    expect(getMonitorSpaceToAppend('team-a', ['default', 'team-a'])).toEqual({});
    expect(getMonitorSpaceToAppend('team-a', ['*'])).toEqual({});
  });

  it('does nothing when the active or monitor spaces are unknown', () => {
    expect(getMonitorSpaceToAppend(undefined, ['default'])).toEqual({});
    expect(getMonitorSpaceToAppend('default', [])).toEqual({});
  });
});

describe('getMonitorSpaceToAppend with accessible spaces', () => {
  it('targets the first monitor space the user can access', () => {
    expect(
      getMonitorSpaceToAppend('fleet-admin', ['default', 'team-a'], ['fleet-admin', 'team-a'])
    ).toEqual({ spaceId: 'team-a' });
  });

  it('falls back to the first monitor space when none is accessible', () => {
    expect(getMonitorSpaceToAppend('fleet-admin', ['default', 'team-a'], ['fleet-admin'])).toEqual({
      spaceId: 'default',
    });
  });

  it('keeps the first monitor space when accessible spaces are unknown', () => {
    expect(getMonitorSpaceToAppend('fleet-admin', ['default', 'team-a'])).toEqual({
      spaceId: 'default',
    });
  });
});

describe('useEditMonitorLocator', () => {
  const getUrl = jest.fn().mockResolvedValue('http://edit-url');
  const locators = { get: () => ({ getUrl }) };
  const httpGet = jest.fn();

  const renderLocator = (monitorSpaces: string[]) =>
    renderHook(() =>
      useEditMonitorLocator({ configId: 'config-1', monitorSpaces, packagePolicyId: 'policy-1' })
    );

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        share: { url: { locators } },
        spaces: { getActiveSpace: jest.fn().mockResolvedValue({ id: 'fleet-admin' }) },
        http: { get: httpGet },
      },
    });
  });

  it('opens the first monitor space the user can access', async () => {
    httpGet.mockResolvedValue([{ id: 'fleet-admin' }, { id: 'team-a' }]);

    renderLocator(['default', 'team-a']);

    await waitFor(() =>
      expect(getUrl).toHaveBeenCalledWith({
        configId: 'config-1',
        packagePolicyId: 'policy-1',
        spaceId: 'team-a',
      })
    );
    expect(httpGet).toHaveBeenCalledWith('/api/spaces/space');
  });

  it('does not look up spaces when the monitor has a single space', async () => {
    renderLocator(['default']);

    await waitFor(() =>
      expect(getUrl).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'default' }))
    );
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('does not look up spaces when the monitor is visible in the active space', async () => {
    renderLocator(['default', 'fleet-admin']);

    await waitFor(() => expect(getUrl).toHaveBeenCalled());
    expect(getUrl).toHaveBeenCalledWith({ configId: 'config-1', packagePolicyId: 'policy-1' });
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('falls back to the first monitor space when the spaces lookup fails', async () => {
    httpGet.mockRejectedValue(new Error('forbidden'));

    renderLocator(['default', 'team-a']);

    await waitFor(() =>
      expect(getUrl).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'default' }))
    );
  });
});
