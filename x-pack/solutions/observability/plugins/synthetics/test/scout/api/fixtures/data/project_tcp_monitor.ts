/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Project TCP monitors fixture. Ported from the FTR fixture
 * `apis/synthetics/fixtures/project_tcp_monitor.json` (read there via
 * `getFixtureJson`). Kept as a typed module so Scout specs can import it
 * directly without filesystem reads.
 */
export const projectTcpMonitorFixture = {
  project: 'test-suite',
  keep_stale: true,
  monitors: [
    {
      locations: ['dev'],
      type: 'tcp',
      id: 'gmail-smtp',
      name: 'GMail SMTP',
      hosts: ['smtp.gmail.com:587'],
      schedule: 1,
      tags: ['service:smtp', 'org:google'],
      privateLocations: [],
      hash: 'ekrjelkjrelkjre',
      'ssl.verification_mode': 'strict',
      maintenance_windows: ['test-maintenance-window-1'],
    },
    {
      locations: ['dev'],
      type: 'tcp',
      id: 'always-down',
      name: 'Always Down',
      hosts: 'localhost:18278',
      schedule: 1,
      tags: 'tag1,tag2',
      privateLocations: [],
      hash: 'ekrjelkjrelkjre',
      maintenance_windows: ['test-maintenance-window-2'],
    },
    {
      locations: ['dev'],
      type: 'tcp',
      id: 'always-down',
      name: 'Always Down',
      hosts: ['localhost', 'anotherhost'],
      ports: ['5698'],
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
