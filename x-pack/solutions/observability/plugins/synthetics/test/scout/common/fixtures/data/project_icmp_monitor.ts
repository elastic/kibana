/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Project ICMP monitors fixture. Ported from the FTR fixture
 * `apis/synthetics/fixtures/project_icmp_monitor.json` (read there via
 * `getFixtureJson`). Kept as a typed module so Scout specs can import it
 * directly without filesystem reads.
 */
export const projectIcmpMonitorFixture = {
  project: 'test-suite',
  keep_stale: true,
  monitors: [
    {
      locations: ['dev'],
      type: 'icmp',
      id: 'Cloudflare-DNS',
      name: 'Cloudflare DNS',
      hosts: ['1.1.1.1'],
      schedule: 1,
      tags: ['service:smtp', 'org:google'],
      privateLocations: [],
      wait: '30s',
      hash: 'ekrjelkjrelkjre',
      maintenance_windows: ['test-maintenance-window-2'],
    },
    {
      locations: ['dev'],
      type: 'icmp',
      id: 'Cloudflare-DNS-2',
      name: 'Cloudflare DNS 2',
      hosts: '1.1.1.1',
      schedule: 1,
      tags: 'tag1,tag2',
      privateLocations: [],
      wait: '1m',
      hash: 'ekrjelkjrelkjre',
    },
    {
      locations: ['dev'],
      type: 'icmp',
      id: 'Cloudflare-DNS-3',
      name: 'Cloudflare DNS 3',
      hosts: '1.1.1.1,2.2.2.2',
      schedule: 1,
      tags: 'tag1,tag2',
      privateLocations: [],
      unsupportedKey: {
        nestedUnsupportedKey: 'unnsuportedValue',
      },
      hash: 'ekrjelkjrelkjre',
    },
  ],
} as const;
