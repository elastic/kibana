/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export { demoTimelineData as mockTimelineData } from './demo_data/timeline';
export { demoEndpointRegistryModificationEvent as mockEndpointRegistryModificationEvent } from './demo_data/endpoint/registry_modification_event';
export { demoEndpointLibraryLoadEvent as mockEndpointLibraryLoadEvent } from './demo_data/endpoint/library_load_event';
export { demoEndpointProcessExecutionMalwarePreventionAlert as mockEndpointProcessExecutionMalwarePreventionAlert } from './demo_data/endpoint/process_execution_malware_prevention_alert';

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
