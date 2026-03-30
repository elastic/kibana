/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useGetIlmPolicies } from './use_get_ilm_policies';
import * as hookPolicyAPI from './api';

describe('useGetIlmPolicies', () => {
  beforeAll(() => {
    const { policiesData, indexSize } = getTestData();

    jest
      .spyOn(hookPolicyAPI, 'getIlmPolicies')
      .mockReturnValue(new Promise((resolve) => resolve(policiesData)));

    jest
      .spyOn(hookPolicyAPI, 'getIndicesData')
      .mockReturnValue(new Promise((resolve) => resolve(indexSize)));
  });

  it('returns the correct data', async () => {
    const { result } = renderHook(() => useGetIlmPolicies());
    await waitFor(() => new Promise((resolve) => resolve(null)));
    expect(result.current.data).toEqual([
      {
        currentSize: '434 MB',
        label: 'All Checks',
        name: 'synthetics',
        policy: policiesData[0],
        retentionPeriod: '180 days + rollover',
      },
      {
        currentSize: '55 MB',
        label: 'Browser Checks',
        name: 'synthetics-synthetics.browser-default_policy',
        retentionPeriod: '365 days + rollover',
        policy: policiesData[1],
      },
      {
        currentSize: '322 MB',
        label: 'Browser Network Requests',
        name: 'synthetics-synthetics.browser_network-default_policy',
        retentionPeriod: '14 days + rollover',
        policy: policiesData[2],
      },
      {
        currentSize: '21 MB',
        label: 'Browser Screenshots',
        name: 'synthetics-synthetics.browser_screenshot-default_policy',
        retentionPeriod: '14 days + rollover',
        policy: policiesData[3],
      },
      {
        currentSize: '36 MB',
        label: 'HTTP Pings',
        name: 'synthetics-synthetics.http-default_policy',
        retentionPeriod: '365 days + rollover',
        policy: policiesData[4],
      },
      {
        currentSize: '0 Bytes',
        label: 'ICMP Pings',
        name: 'synthetics-synthetics.icmp-default_policy',
        retentionPeriod: '365 days + rollover',
        policy: policiesData[5],
      },
      {
        currentSize: '0 Bytes',
        label: 'TCP Pings',
        name: 'synthetics-synthetics.tcp-default_policy',
        retentionPeriod: '365 days + rollover',
        policy: policiesData[6],
      },
    ]);
  });
});

const policiesData: any = [
  {
    name: 'synthetics',
    modifiedDate: '2022-11-03T18:26:30.477Z',
    version: 3,
    policy: {
      phases: {
        warm: {
          min_age: '4d',
          actions: { forcemerge: { max_num_segments: 1 }, set_priority: { priority: 50 } },
        },
        cold: { min_age: '90d', actions: { set_priority: { priority: 0 } } },
        hot: {
          min_age: '0ms',
          actions: { rollover: { max_primary_shard_size: '50gb', max_age: '3d' } },
        },
        delete: { min_age: '180d', actions: { delete: { delete_searchable_snapshot: true } } },
      },
    },
    indices: [],
    dataStreams: [],
    indexTemplates: ['synthetics'],
  },
  {
    name: 'synthetics-synthetics.browser-default_policy',
    modifiedDate: '2022-10-10T16:22:38.714Z',
    version: 1,
    policy: {
      phases: {
        hot: {
          min_age: '0ms',
          actions: {
            rollover: { max_size: '50gb', max_age: '30d' },
            set_priority: { priority: 100 },
          },
        },
        delete: { min_age: '365d', actions: { delete: { delete_searchable_snapshot: true } } },
      },
      _meta: { package: { name: 'synthetics' }, managed_by: 'fleet', managed: true },
    },
    indices: [
      '.ds-synthetics-browser-default-2022.10.11-000001',
      '.ds-synthetics-browser-test_monitor-2022.10.13-000001',
      '.ds-synthetics-browser-test_monitor-2022.11.01-000002',
      '.ds-synthetics-browser-default-2022.11.01-000002',
    ],
    dataStreams: ['synthetics-browser-default', 'synthetics-browser-test_monitor'],
    indexTemplates: ['synthetics-browser'],
  },
  {
    name: 'synthetics-synthetics.browser_network-default_policy',
    modifiedDate: '2022-11-01T07:11:11.452Z',
    version: 2,
    policy: {
      phases: {
        hot: {
          min_age: '0ms',
          actions: { rollover: { max_age: '1d' }, set_priority: { priority: 100 } },
        },
        delete: { min_age: '14d', actions: { delete: { delete_searchable_snapshot: true } } },
      },
      _meta: { package: { name: 'synthetics' }, managed_by: 'fleet', managed: true },
    },
    indices: [
      '.ds-synthetics-browser.network-default-2022.10.31-000022',
      '.ds-synthetics-browser.network-default-2022.10.26-000017',
      '.ds-synthetics-browser.network-default-2022.11.04-000030',
      '.ds-synthetics-browser.network-test_monitor-2022.10.14-000002',
      '.ds-synthetics-browser.network-default-2022.11.07-000036',
      '.ds-synthetics-browser.network-default-2022.11.05-000032',
      '.ds-synthetics-browser.network-default-2022.11.08-000038',
      '.ds-synthetics-browser.network-default-2022.11.06-000034',
      '.ds-synthetics-browser.network-default-2022.10.25-000015',
      '.ds-synthetics-browser.network-default-2022.11.02-000026',
      '.ds-synthetics-browser.network-default-2022.11.01-000024',
      '.ds-synthetics-browser.network-default-2022.11.03-000028',
    ],
    dataStreams: ['synthetics-browser.network-test_monitor', 'synthetics-browser.network-default'],
    indexTemplates: ['synthetics-browser.network'],
  },
  {
    name: 'synthetics-synthetics.browser_screenshot-default_policy',
    modifiedDate: '2022-11-03T20:43:55.861Z',
    version: 2,
    policy: {
      phases: {
        hot: {
          min_age: '0ms',
          actions: { rollover: { max_age: '1d' }, set_priority: { priority: 100 } },
        },
        delete: { min_age: '14d', actions: { delete: { delete_searchable_snapshot: true } } },
      },
      _meta: { package: { name: 'synthetics' }, managed_by: 'fleet', managed: true },
    },
    indices: [
      '.ds-synthetics-browser.screenshot-default-2022.11.05-000031',
      '.ds-synthetics-browser.screenshot-default-2022.11.06-000033',
      '.ds-synthetics-browser.screenshot-default-2022.11.08-000036',
      '.ds-synthetics-browser.screenshot-default-2022.11.07-000034',
      '.ds-synthetics-browser.screenshot-default-2022.11.01-000023',
      '.ds-synthetics-browser.screenshot-default-2022.11.02-000025',
      '.ds-synthetics-browser.screenshot-default-2022.11.03-000027',
      '.ds-synthetics-browser.screenshot-default-2022.11.04-000029',
      '.ds-synthetics-browser.screenshot-default-2022.10.25-000014',
      '.ds-synthetics-browser.screenshot-default-2022.10.31-000021',
      '.ds-synthetics-browser.screenshot-test_monitor-2022.10.14-000002',
      '.ds-synthetics-browser.screenshot-default-2022.10.26-000015',
    ],
    dataStreams: [
      'synthetics-browser.screenshot-default',
      'synthetics-browser.screenshot-test_monitor',
    ],
    indexTemplates: ['synthetics-browser.screenshot'],
  },
  {
    name: 'synthetics-synthetics.http-default_policy',
    modifiedDate: '2022-11-03T20:43:55.779Z',
    version: 2,
    policy: {
      phases: {
        hot: {
          min_age: '0ms',
          actions: {
            rollover: { max_size: '50gb', max_age: '30d' },
            set_priority: { priority: 100 },
          },
        },
        delete: { min_age: '365d', actions: { delete: { delete_searchable_snapshot: true } } },
      },
      _meta: { package: { name: 'synthetics' }, managed_by: 'fleet', managed: true },
    },
    indices: [
      '.ds-synthetics-http-default-2022.10.10-000001',
      '.ds-synthetics-http-default-2022.11.01-000002',
    ],
    dataStreams: ['synthetics-http-default'],
    indexTemplates: ['synthetics-http'],
  },
  {
    name: 'synthetics-synthetics.icmp-default_policy',
    modifiedDate: '2022-11-03T20:43:55.819Z',
    version: 1,
    policy: {
      phases: {
        hot: {
          min_age: '0ms',
          actions: {
            rollover: { max_size: '50gb', max_age: '30d' },
            set_priority: { priority: 100 },
          },
        },
        delete: { min_age: '365d', actions: { delete: { delete_searchable_snapshot: true } } },
      },
      _meta: { package: { name: 'synthetics' }, managed_by: 'fleet', managed: true },
    },
    indices: [],
    dataStreams: [],
    indexTemplates: ['synthetics-icmp'],
  },
  {
    name: 'synthetics-synthetics.tcp-default_policy',
    modifiedDate: '2022-11-03T20:43:55.911Z',
    version: 1,
    policy: {
      phases: {
        hot: {
          min_age: '0ms',
          actions: {
            rollover: { max_size: '50gb', max_age: '30d' },
            set_priority: { priority: 100 },
          },
        },
        delete: { min_age: '365d', actions: { delete: { delete_searchable_snapshot: true } } },
      },
      _meta: { package: { name: 'synthetics' }, managed_by: 'fleet', managed: true },
    },
    indices: [],
    dataStreams: [],
    indexTemplates: ['synthetics-tcp'],
  },
];

const indexSize = {
  data: [
    { index: '.ds-synthetics-browser.screenshot-default-2022.11.05-000031', sizeInBytes: 665872 },
    { index: '.ds-synthetics-browser.network-default-2022.10.26-000017', sizeInBytes: 3203973 },
    { index: '.ds-synthetics-browser.screenshot-default-2022.11.04-000029', sizeInBytes: 2260733 },
    { index: '.ds-synthetics-browser.screenshot-default-2022.11.06-000033', sizeInBytes: 1628330 },
    { index: '.ds-synthetics-http-default-2022.10.10-000001', sizeInBytes: 27561629 },
    { index: '.ds-synthetics-browser.network-default-2022.11.02-000026', sizeInBytes: 53762582 },
    { index: '.ds-synthetics-browser.screenshot-default-2022.10.31-000021', sizeInBytes: 1860519 },
    { index: '.ds-synthetics-browser.network-default-2022.11.03-000028', sizeInBytes: 46353084 },
    { index: '.ds-synthetics-browser.network-default-2022.11.05-000032', sizeInBytes: 7450666 },
    { index: '.ds-synthetics-browser-default-2022.11.01-000002', sizeInBytes: 12851228 },
    { index: '.ds-synthetics-browser.network-default-2022.11.06-000034', sizeInBytes: 24675440 },
    { index: '.ds-synthetics-browser.screenshot-default-2022.11.07-000034', sizeInBytes: 1819473 },
    { index: '.ds-synthetics-http-default-2022.11.01-000002', sizeInBytes: 10238049 },
    { index: '.ds-synthetics-browser.screenshot-default-2022.11.08-000036', sizeInBytes: 1840166 },
    { index: '.ds-synthetics-browser.network-default-2022.10.31-000022', sizeInBytes: 18161661 },
    { index: '.ds-synthetics-browser-test_monitor-2022.11.01-000002', sizeInBytes: 450 },
    { index: '.ds-synthetics-browser.screenshot-default-2022.10.25-000014', sizeInBytes: 1755495 },
    { index: '.ds-synthetics-browser.network-default-2022.11.07-000036', sizeInBytes: 32981897 },
    { index: '.ds-synthetics-browser.screenshot-default-2022.11.01-000023', sizeInBytes: 3891146 },
    { index: '.ds-synthetics-browser.network-default-2022.11.08-000038', sizeInBytes: 29443605 },
    { index: '.ds-synthetics-browser-test_monitor-2022.10.13-000001', sizeInBytes: 530788 },
    { index: '.ds-synthetics-browser.network-default-2022.10.25-000015', sizeInBytes: 24126155 },
    { index: '.ds-synthetics-browser.network-test_monitor-2022.10.14-000002', sizeInBytes: 450 },
    { index: '.ds-synthetics-browser.network-default-2022.11.01-000024', sizeInBytes: 64835940 },
    { index: '.ds-synthetics-browser.screenshot-default-2022.10.26-000015', sizeInBytes: 440107 },
    { index: '.ds-synthetics-browser.network-default-2022.11.04-000030', sizeInBytes: 32964903 },
    { index: '.ds-synthetics-browser.screenshot-default-2022.11.02-000025', sizeInBytes: 3309415 },
    { index: '.ds-synthetics-browser.screenshot-test_monitor-2022.10.14-000002', sizeInBytes: 450 },
    { index: '.ds-synthetics-browser-default-2022.10.11-000001', sizeInBytes: 44228681 },
    { index: '.ds-synthetics-browser.screenshot-default-2022.11.03-000027', sizeInBytes: 2449941 },
  ],
  _inspect: [],
};

const getTestData = () => {
  return { policiesData, indexSize };
};
