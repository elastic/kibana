/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  privateLocationCoversAllMonitorSpaces,
  validateMonitorPrivateLocationSpaces,
} from './monitor_locations_utils';
import { ConfigKey } from '../../../common/runtime_types';
import type { MonitorFields, SyntheticsPrivateLocations } from '../../../common/runtime_types';

describe('privateLocationCoversAllMonitorSpaces', () => {
  it('returns false when locationSpaces is undefined', () => {
    expect(privateLocationCoversAllMonitorSpaces(['space-a'], undefined)).toBe(false);
  });

  it('returns false when locationSpaces is empty', () => {
    expect(privateLocationCoversAllMonitorSpaces(['space-a'], [])).toBe(false);
  });

  it('returns true when location has * (all spaces)', () => {
    expect(privateLocationCoversAllMonitorSpaces(['space-a', 'space-b'], ['*'])).toBe(true);
  });

  it('returns true when location spaces are a superset of monitor spaces', () => {
    expect(privateLocationCoversAllMonitorSpaces(['space-a'], ['space-a', 'space-b'])).toBe(true);
  });

  it('returns true when location spaces exactly match monitor spaces', () => {
    expect(
      privateLocationCoversAllMonitorSpaces(['space-a', 'space-b'], ['space-a', 'space-b'])
    ).toBe(true);
  });

  it('returns false when location spaces are a subset of monitor spaces', () => {
    expect(privateLocationCoversAllMonitorSpaces(['space-a', 'space-b'], ['space-a'])).toBe(false);
  });

  it('returns false when location spaces do not overlap', () => {
    expect(privateLocationCoversAllMonitorSpaces(['space-a'], ['space-b'])).toBe(false);
  });

  it('returns true for empty monitorSpaces', () => {
    expect(privateLocationCoversAllMonitorSpaces([], ['space-a'])).toBe(true);
  });

  it('requires location to also be * when monitor spaces include *', () => {
    expect(privateLocationCoversAllMonitorSpaces(['*'], ['space-a'])).toBe(false);
    expect(privateLocationCoversAllMonitorSpaces(['*'], ['*'])).toBe(true);
  });

  it('treats monitor with * among other spaces as all-spaces', () => {
    expect(privateLocationCoversAllMonitorSpaces(['*', 'space-a'], ['space-a'])).toBe(false);
    expect(privateLocationCoversAllMonitorSpaces(['*', 'space-a'], ['*'])).toBe(true);
  });
});

describe('validateMonitorPrivateLocationSpaces', () => {
  const makeMonitor = (
    locations: Array<{ id: string; label: string; isServiceManaged: boolean }>,
    spaces: string[]
  ) =>
    ({
      [ConfigKey.LOCATIONS]: locations,
      [ConfigKey.KIBANA_SPACES]: spaces,
    } as unknown as MonitorFields);

  const makePrivateLocations = (
    locs: Array<{ id: string; label: string; spaces?: string[] }>
  ): SyntheticsPrivateLocations =>
    locs.map((loc) => ({
      id: loc.id,
      label: loc.label,
      agentPolicyId: 'policy-1',
      isServiceManaged: false,
      spaces: loc.spaces,
    }));

  it('returns null when monitor has no spaces', () => {
    const monitor = makeMonitor(
      [{ id: 'private-loc-1', label: 'Private Location 1', isServiceManaged: false }],
      []
    );
    const privateLocations = makePrivateLocations([
      { id: 'private-loc-1', label: 'Private Location 1', spaces: ['space-a'] },
    ]);
    expect(validateMonitorPrivateLocationSpaces(monitor, privateLocations)).toBeNull();
  });

  it('returns null when monitor has no private locations', () => {
    const monitor = makeMonitor(
      [{ id: 'us-east', label: 'US East', isServiceManaged: true }],
      ['space-a', 'space-b']
    );
    expect(validateMonitorPrivateLocationSpaces(monitor, [])).toBeNull();
  });

  it('returns null when all private locations cover all monitor spaces', () => {
    const monitor = makeMonitor(
      [{ id: 'private-loc-1', label: 'Private Location 1', isServiceManaged: false }],
      ['space-a', 'space-b']
    );
    const privateLocations = makePrivateLocations([
      { id: 'private-loc-1', label: 'Private Location 1', spaces: ['space-a', 'space-b'] },
    ]);
    expect(validateMonitorPrivateLocationSpaces(monitor, privateLocations)).toBeNull();
  });

  it('returns null when private location has * spaces', () => {
    const monitor = makeMonitor(
      [{ id: 'private-loc-1', label: 'Private Location 1', isServiceManaged: false }],
      ['space-a', 'space-b', 'space-c']
    );
    const privateLocations = makePrivateLocations([
      { id: 'private-loc-1', label: 'Private Location 1', spaces: ['*'] },
    ]);
    expect(validateMonitorPrivateLocationSpaces(monitor, privateLocations)).toBeNull();
  });

  it('returns error when monitor has * spaces but private location does not', () => {
    const monitor = makeMonitor(
      [{ id: 'private-loc-1', label: 'Private Location 1', isServiceManaged: false }],
      ['*']
    );
    const privateLocations = makePrivateLocations([
      { id: 'private-loc-1', label: 'Private Location 1', spaces: ['space-a'] },
    ]);
    const result = validateMonitorPrivateLocationSpaces(monitor, privateLocations);
    expect(result).not.toBeNull();
    expect(result!.attributes.errors).toHaveLength(1);
    expect(result!.attributes.errors[0].locationId).toBe('private-loc-1');
  });

  it('returns null when both monitor and private location have * spaces', () => {
    const monitor = makeMonitor(
      [{ id: 'private-loc-1', label: 'Private Location 1', isServiceManaged: false }],
      ['*']
    );
    const privateLocations = makePrivateLocations([
      { id: 'private-loc-1', label: 'Private Location 1', spaces: ['*'] },
    ]);
    expect(validateMonitorPrivateLocationSpaces(monitor, privateLocations)).toBeNull();
  });

  it('returns error when private location does not cover all monitor spaces', () => {
    const monitor = makeMonitor(
      [{ id: 'private-loc-1', label: 'Private Location 1', isServiceManaged: false }],
      ['space-a', 'space-b']
    );
    const privateLocations = makePrivateLocations([
      { id: 'private-loc-1', label: 'Private Location 1', spaces: ['space-a'] },
    ]);
    const result = validateMonitorPrivateLocationSpaces(monitor, privateLocations);
    expect(result).not.toBeNull();
    expect(result!.attributes.errors).toHaveLength(1);
    expect(result!.attributes.errors[0].locationId).toBe('private-loc-1');
    expect(result!.attributes.errors[0].missingSpaces).toEqual(['space-b']);
  });

  it('returns errors for multiple failing private locations', () => {
    const monitor = makeMonitor(
      [
        { id: 'private-loc-1', label: 'Private Location 1', isServiceManaged: false },
        { id: 'private-loc-2', label: 'Private Location 2', isServiceManaged: false },
      ],
      ['space-a', 'space-b']
    );
    const privateLocations = makePrivateLocations([
      { id: 'private-loc-1', label: 'Private Location 1', spaces: ['space-a'] },
      { id: 'private-loc-2', label: 'Private Location 2', spaces: ['space-b'] },
    ]);
    const result = validateMonitorPrivateLocationSpaces(monitor, privateLocations);
    expect(result).not.toBeNull();
    expect(result!.attributes.errors).toHaveLength(2);
  });

  it('returns error when private location has undefined spaces', () => {
    const monitor = makeMonitor(
      [{ id: 'private-loc-1', label: 'Private Location 1', isServiceManaged: false }],
      ['space-a']
    );
    const privateLocations = makePrivateLocations([
      { id: 'private-loc-1', label: 'Private Location 1' },
    ]);
    const result = validateMonitorPrivateLocationSpaces(monitor, privateLocations);
    expect(result).not.toBeNull();
    expect(result!.attributes.errors[0].locationId).toBe('private-loc-1');
  });

  it('ignores public (service-managed) locations', () => {
    const monitor = makeMonitor(
      [
        { id: 'us-east', label: 'US East', isServiceManaged: true },
        { id: 'private-loc-1', label: 'Private Location 1', isServiceManaged: false },
      ],
      ['space-a']
    );
    const privateLocations = makePrivateLocations([
      { id: 'private-loc-1', label: 'Private Location 1', spaces: ['space-a'] },
    ]);
    expect(validateMonitorPrivateLocationSpaces(monitor, privateLocations)).toBeNull();
  });
});
