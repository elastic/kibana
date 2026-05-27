/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRemoteMonitorDetailUrl } from './remote_monitor_urls';

const baseMonitor = {
  configId: 'monitor-abc',
  remote: { remoteName: 'remote-cluster-1', kibanaUrl: 'https://remote.example.com' },
};

describe('createRemoteMonitorDetailUrl', () => {
  it('returns undefined when the monitor is not remote', () => {
    expect(
      createRemoteMonitorDetailUrl({
        monitor: { configId: 'monitor-abc', remote: undefined },
        locationId: 'us-east-1',
      })
    ).toBeUndefined();
  });

  it('returns undefined when kibanaUrl is missing', () => {
    expect(
      createRemoteMonitorDetailUrl({
        monitor: { configId: 'monitor-abc', remote: { remoteName: 'remote-cluster-1' } },
        locationId: 'us-east-1',
      })
    ).toBeUndefined();
  });

  it('builds the default-space deep link without an /s/ prefix', () => {
    const url = createRemoteMonitorDetailUrl({
      monitor: baseMonitor,
      locationId: 'us-east-1',
      spaceId: 'default',
    });
    expect(url).toBe(
      'https://remote.example.com/app/synthetics/monitor/monitor-abc?locationId=us-east-1'
    );
  });

  it('omits the /s/ prefix when spaceId is undefined', () => {
    const url = createRemoteMonitorDetailUrl({
      monitor: baseMonitor,
      locationId: 'us-east-1',
    });
    expect(url).toBe(
      'https://remote.example.com/app/synthetics/monitor/monitor-abc?locationId=us-east-1'
    );
  });

  it('adds an /s/<spaceId> prefix for non-default spaces', () => {
    const url = createRemoteMonitorDetailUrl({
      monitor: baseMonitor,
      locationId: 'us-east-1',
      spaceId: 'team-a',
    });
    expect(url).toBe(
      'https://remote.example.com/s/team-a/app/synthetics/monitor/monitor-abc?locationId=us-east-1'
    );
  });

  it('normalizes trailing slashes on kibanaUrl', () => {
    const url = createRemoteMonitorDetailUrl({
      monitor: {
        ...baseMonitor,
        remote: { remoteName: 'remote-cluster-1', kibanaUrl: 'https://remote.example.com//' },
      },
      locationId: 'us-east-1',
      spaceId: 'team-a',
    });
    expect(url).toBe(
      'https://remote.example.com/s/team-a/app/synthetics/monitor/monitor-abc?locationId=us-east-1'
    );
  });

  it('URL-encodes configIds that contain reserved characters', () => {
    const url = createRemoteMonitorDetailUrl({
      monitor: {
        ...baseMonitor,
        configId: 'weird/id with:colon',
      },
      locationId: 'us-east-1',
    });
    expect(url).toBe(
      'https://remote.example.com/app/synthetics/monitor/weird%2Fid%20with%3Acolon?locationId=us-east-1'
    );
  });

  it('URL-encodes locationIds via searchParams', () => {
    const url = createRemoteMonitorDetailUrl({
      monitor: baseMonitor,
      locationId: 'east west',
    });
    expect(url).toBe(
      'https://remote.example.com/app/synthetics/monitor/monitor-abc?locationId=east+west'
    );
  });

  it('omits the locationId query param when not provided', () => {
    const url = createRemoteMonitorDetailUrl({
      monitor: baseMonitor,
    });
    expect(url).toBe('https://remote.example.com/app/synthetics/monitor/monitor-abc');
  });

  it('omits the locationId query param when an empty string is provided', () => {
    const url = createRemoteMonitorDetailUrl({
      monitor: baseMonitor,
      locationId: '',
    });
    expect(url).toBe('https://remote.example.com/app/synthetics/monitor/monitor-abc');
  });
});
