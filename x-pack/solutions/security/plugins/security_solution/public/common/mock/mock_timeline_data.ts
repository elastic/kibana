/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export { demoTimelineData as mockTimelineData } from '../demo_data/timeline';
export { demoEndpointRegistryModificationEvent as mockEndpointRegistryModificationEvent } from '../demo_data/endpoint/registry_modification_event';
export { demoEndpointLibraryLoadEvent as mockEndpointLibraryLoadEvent } from '../demo_data/endpoint/library_load_event';
export { demoEndpointProcessExecutionMalwarePreventionAlert as mockEndpointProcessExecutionMalwarePreventionAlert } from '../demo_data/endpoint/process_execution_malware_prevention_alert';

export const mockFimFileCreatedEvent: Ecs = {
  _id: 'WuBP4W0BOpWiDweSoYSg',
  timestamp: '2019-10-18T23:59:15.091Z',
  host: {
    architecture: ['x86_64'],
    os: {
      family: ['debian'],
      name: ['Ubuntu'],
      kernel: ['4.15.0-1046-gcp'],
      platform: ['ubuntu'],
      version: ['16.04.6 LTS (Xenial Xerus)'],
    },
    id: ['host-id-123'],
    name: ['foohost'],
  },
  file: {
    path: ['/etc/subgid'],
    size: [4445],
    owner: ['root'],
    inode: ['90027'],
    ctime: ['2019-10-18T23:59:14.872Z'],
    gid: ['0'],
    type: ['file'],
    mode: ['0644'],
    mtime: ['2019-10-18T23:59:14.872Z'],
    uid: ['0'],
    group: ['root'],
  },
  event: {
    module: ['file_integrity'],
    dataset: ['file'],
    action: ['created'],
  },
};

export const mockFimFileDeletedEvent: Ecs = {
  _id: 'M-BP4W0BOpWiDweSo4cm',
  timestamp: '2019-10-18T23:59:16.247Z',
  host: {
    name: ['foohost'],
    os: {
      platform: ['ubuntu'],
      version: ['16.04.6 LTS (Xenial Xerus)'],
      family: ['debian'],
      name: ['Ubuntu'],
      kernel: ['4.15.0-1046-gcp'],
    },
    id: ['host-id-123'],
    architecture: ['x86_64'],
  },
  event: {
    module: ['file_integrity'],
    dataset: ['file'],
    action: ['deleted'],
  },
  file: {
    path: ['/etc/gshadow.lock'],
  },
};

export const mockSocketOpenedEvent: Ecs = {
  _id: 'Vusu4m0BOpWiDweSLkXY',
  timestamp: '2019-10-19T04:02:19.473Z',
  network: {
    direction: ['outbound'],
    transport: ['tcp'],
    community_id: ['1:network-community_id'],
  },
  host: {
    name: ['foohost'],
    architecture: ['x86_64'],
    os: {
      platform: ['centos'],
      version: ['7 (Core)'],
      family: ['redhat'],
      name: ['CentOS Linux'],
      kernel: ['3.10.0-1062.1.2.el7.x86_64'],
    },
    id: ['host-id-123'],
  },
  process: {
    pid: [2166],
    name: ['google_accounts'],
  },
  destination: {
    ip: ['10.1.2.3'],
    port: [80],
  },
  user: {
    name: ['root'],
  },
  source: {
    port: [59554],
    ip: ['10.4.20.1'],
  },
  event: {
    action: ['socket_opened'],
    module: ['system'],
    dataset: ['socket'],
    kind: ['event'],
  },
  message: [
    'Outbound socket (10.4.20.1:59554 -> 10.1.2.3:80) OPENED by process google_accounts (PID: 2166) and user root (UID: 0)',
  ],
};

export const mockSocketClosedEvent: Ecs = {
  _id: 'V-su4m0BOpWiDweSLkXY',
  timestamp: '2019-10-19T04:02:19.473Z',
  process: {
    pid: [2166],
    name: ['google_accounts'],
  },
  user: {
    name: ['root'],
  },
  source: {
    port: [59508],
    ip: ['10.4.20.1'],
  },
  event: {
    dataset: ['socket'],
    kind: ['event'],
    action: ['socket_closed'],
    module: ['system'],
  },
  message: [
    'Outbound socket (10.4.20.1:59508 -> 10.1.2.3:80) CLOSED by process google_accounts (PID: 2166) and user root (UID: 0)',
  ],
  network: {
    community_id: ['1:network-community_id'],
    direction: ['outbound'],
    transport: ['tcp'],
  },
  destination: {
    ip: ['10.1.2.3'],
    port: [80],
  },
  host: {
    name: ['foohost'],
    architecture: ['x86_64'],
    os: {
      version: ['7 (Core)'],
      family: ['redhat'],
      name: ['CentOS Linux'],
      kernel: ['3.10.0-1062.1.2.el7.x86_64'],
      platform: ['centos'],
    },
    id: ['host-id-123'],
  },
};

export const mockDnsEvent: Ecs = {
  _id: 'VUTUqm0BgJt5sZM7nd5g',
  destination: {
    domain: ['ten.one.one.one'],
    port: [53],
    bytes: [137],
    ip: ['10.1.1.1'],
    geo: {
      continent_name: ['Oceania'],
      location: {
        lat: [-33.494],
        lon: [143.2104],
      },
      country_iso_code: ['AU'],
      country_name: ['Australia'],
      city_name: [''],
    },
  },
  host: {
    architecture: ['armv7l'],
    id: ['host-id'],
    os: {
      family: ['debian'],
      platform: ['raspbian'],
      version: ['9 (stretch)'],
      name: ['Raspbian GNU/Linux'],
      kernel: ['4.19.57-v7+'],
    },
    name: ['iot.example.com'],
  },
  dns: {
    question: {
      name: ['lookup.example.com'],
      type: ['A'],
    },
    response_code: ['NOERROR'],
    resolved_ip: ['10.1.2.3'],
  },
  timestamp: '2019-10-08T10:05:23.241Z',
  network: {
    community_id: ['1:network-community_id'],
    direction: ['outbound'],
    bytes: [177],
    transport: ['udp'],
    protocol: ['dns'],
  },
  event: {
    duration: [6937500],
    category: ['network_traffic'],
    dataset: ['dns'],
    kind: ['event'],
    end: ['2019-10-08T10:05:23.248Z'],
    start: ['2019-10-08T10:05:23.241Z'],
  },
  source: {
    port: [58732],
    bytes: [40],
    ip: ['10.9.9.9'],
  },
};
