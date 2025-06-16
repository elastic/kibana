/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockFileEventsQueryResults = {
  took: 10,
  timed_out: false,
  _shards: {
    total: 5,
    successful: 5,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 10,
      relation: 'gte',
    },
    max_score: 1,
    hits: [
      {
        _index: '.ds-logs-endpoint.events.file-default-2024.09.16-000001',
        _id: '1WgClZIBomhdMPLEGc-s',
        _score: 1,
        _source: {
          agent: {
            id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            type: 'endpoint',
            version: '8.15.1',
          },
          process: {
            name: 'systemd',
            pid: 1,
            entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTEtMTcyNjQ4NDM0NQ==',
            executable: '/usr/lib/systemd/systemd',
          },
          message: 'Endpoint file event',
          '@timestamp': '2024-10-16T11:06:12.1806296Z',
          file: {
            Ext: {
              original: {
                path: '/run/systemd/units/.#invocation:gce-workload-cert-refresh.service13e32c882e5449c0',
                extension: 'service13e32c882e5449c0',
                name: '.#invocation:gce-workload-cert-refresh.service13e32c882e5449c0',
              },
            },
            path: '/run/systemd/units/invocation:gce-workload-cert-refresh.service',
            extension: 'service',
            name: 'invocation:gce-workload-cert-refresh.service',
          },
          ecs: {
            version: '8.10.0',
          },
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.events.file',
          },
          elastic: {
            agent: {
              id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            },
          },
          host: {
            hostname: 'endpoint-complete-deb-gd-1',
            os: {
              Ext: {
                variant: 'Debian',
              },
              kernel: '6.1.0-25-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.106-3 (2024-08-26)',
              name: 'Linux',
              family: 'debian',
              type: 'linux',
              version: '12.7',
              platform: 'debian',
              full: 'Debian 12.7',
            },
            ip: ['127.0.0.1', '::1', '10.142.0.11', 'fe80::4001:aff:fe8e:b'],
            name: 'endpoint-complete-deb-gd-1',
            id: '18a77774a51b4024813da8493f10c056',
            mac: ['42-01-0a-8e-00-0b'],
            architecture: 'x86_64',
          },
          event: {
            agent_id_status: 'verified',
            sequence: 2524785,
            ingested: '2024-10-16T11:06:35Z',
            created: '2024-10-16T11:06:12.1806296Z',
            kind: 'event',
            module: 'endpoint',
            action: 'rename',
            id: 'NiUEE6P7Pv00Sp1S++++9q6D',
            category: ['file'],
            type: ['change'],
            dataset: 'endpoint.events.file',
            outcome: 'unknown',
          },
          user: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
          group: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
        },
      },
      {
        _index: '.ds-logs-endpoint.events.file-default-2024.09.16-000001',
        _id: '2GgClZIBomhdMPLEGc-s',
        _score: 1,
        _source: {
          agent: {
            id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            type: 'endpoint',
            version: '8.15.1',
          },
          process: {
            parent: {
              entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTEtMTcyNjQ4NDM0NQ==',
            },
            name: 'systemd-journald',
            pid: 217,
            entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTIxNy0xNzI2NDg0MzQ4',
            executable: '/usr/lib/systemd/systemd-journald',
          },
          message: 'Endpoint file event',
          '@timestamp': '2024-10-16T11:06:12.2007223Z',
          file: {
            path: '/run/systemd/journal/streams/.#8:5203253Z9Q47q',
            name: '.#8:5203253Z9Q47q',
          },
          ecs: {
            version: '8.10.0',
          },
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.events.file',
          },
          elastic: {
            agent: {
              id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            },
          },
          host: {
            hostname: 'endpoint-complete-deb-gd-1',
            os: {
              Ext: {
                variant: 'Debian',
              },
              kernel: '6.1.0-25-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.106-3 (2024-08-26)',
              name: 'Linux',
              family: 'debian',
              type: 'linux',
              version: '12.7',
              platform: 'debian',
              full: 'Debian 12.7',
            },
            ip: ['127.0.0.1', '::1', '10.142.0.11', 'fe80::4001:aff:fe8e:b'],
            name: 'endpoint-complete-deb-gd-1',
            id: '18a77774a51b4024813da8493f10c056',
            mac: ['42-01-0a-8e-00-0b'],
            architecture: 'x86_64',
          },
          event: {
            agent_id_status: 'verified',
            sequence: 2524790,
            ingested: '2024-10-16T11:06:35Z',
            created: '2024-10-16T11:06:12.2007223Z',
            kind: 'event',
            module: 'endpoint',
            action: 'creation',
            id: 'NiUEE6P7Pv00Sp1S++++9q6L',
            category: ['file'],
            type: ['creation'],
            dataset: 'endpoint.events.file',
            outcome: 'unknown',
          },
          user: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
          group: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
        },
      },
      {
        _index: '.ds-logs-endpoint.events.file-default-2024.09.16-000001',
        _id: '2WgClZIBomhdMPLEGc-s',
        _score: 1,
        _source: {
          agent: {
            id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            type: 'endpoint',
            version: '8.15.1',
          },
          process: {
            parent: {
              entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTEtMTcyNjQ4NDM0NQ==',
            },
            name: 'systemd-journald',
            pid: 217,
            entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTIxNy0xNzI2NDg0MzQ4',
            executable: '/usr/lib/systemd/systemd-journald',
          },
          message: 'Endpoint file event',
          '@timestamp': '2024-10-16T11:06:12.20079Z',
          file: {
            Ext: {
              original: {
                path: '/run/systemd/journal/streams/.#8:5203253Z9Q47q',
                name: '.#8:5203253Z9Q47q',
              },
            },
            path: '/run/systemd/journal/streams/8:5203253',
            name: '8:5203253',
          },
          ecs: {
            version: '8.10.0',
          },
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.events.file',
          },
          elastic: {
            agent: {
              id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            },
          },
          host: {
            hostname: 'endpoint-complete-deb-gd-1',
            os: {
              Ext: {
                variant: 'Debian',
              },
              kernel: '6.1.0-25-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.106-3 (2024-08-26)',
              name: 'Linux',
              family: 'debian',
              type: 'linux',
              version: '12.7',
              platform: 'debian',
              full: 'Debian 12.7',
            },
            ip: ['127.0.0.1', '::1', '10.142.0.11', 'fe80::4001:aff:fe8e:b'],
            name: 'endpoint-complete-deb-gd-1',
            id: '18a77774a51b4024813da8493f10c056',
            mac: ['42-01-0a-8e-00-0b'],
            architecture: 'x86_64',
          },
          event: {
            agent_id_status: 'verified',
            sequence: 2524791,
            ingested: '2024-10-16T11:06:35Z',
            created: '2024-10-16T11:06:12.20079Z',
            kind: 'event',
            module: 'endpoint',
            action: 'rename',
            id: 'NiUEE6P7Pv00Sp1S++++9q6M',
            category: ['file'],
            type: ['change'],
            dataset: 'endpoint.events.file',
            outcome: 'unknown',
          },
          user: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
          group: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
        },
      },
      {
        _index: '.ds-logs-endpoint.events.file-default-2024.09.16-000001',
        _id: '3WgClZIBomhdMPLEGc-s',
        _score: 1,
        _source: {
          agent: {
            id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            type: 'endpoint',
            version: '8.15.1',
          },
          process: {
            name: 'systemd',
            pid: 1,
            entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTEtMTcyNjQ4NDM0NQ==',
            executable: '/usr/lib/systemd/systemd',
          },
          message: 'Endpoint file event',
          '@timestamp': '2024-10-16T11:06:12.2180429Z',
          file: {
            path: '/run/systemd/units/invocation:gce-workload-cert-refresh.service',
            extension: 'service',
            name: 'invocation:gce-workload-cert-refresh.service',
          },
          ecs: {
            version: '8.10.0',
          },
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.events.file',
          },
          elastic: {
            agent: {
              id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            },
          },
          host: {
            hostname: 'endpoint-complete-deb-gd-1',
            os: {
              Ext: {
                variant: 'Debian',
              },
              kernel: '6.1.0-25-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.106-3 (2024-08-26)',
              name: 'Linux',
              family: 'debian',
              type: 'linux',
              version: '12.7',
              platform: 'debian',
              full: 'Debian 12.7',
            },
            ip: ['127.0.0.1', '::1', '10.142.0.11', 'fe80::4001:aff:fe8e:b'],
            name: 'endpoint-complete-deb-gd-1',
            id: '18a77774a51b4024813da8493f10c056',
            mac: ['42-01-0a-8e-00-0b'],
            architecture: 'x86_64',
          },
          event: {
            agent_id_status: 'verified',
            sequence: 2524798,
            ingested: '2024-10-16T11:06:35Z',
            created: '2024-10-16T11:06:12.2180429Z',
            kind: 'event',
            module: 'endpoint',
            action: 'deletion',
            id: 'NiUEE6P7Pv00Sp1S++++9q6W',
            category: ['file'],
            type: ['deletion'],
            dataset: 'endpoint.events.file',
            outcome: 'unknown',
          },
          user: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
          group: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
        },
      },
      {
        _index: '.ds-logs-endpoint.events.file-default-2024.09.16-000001',
        _id: '3mgClZIBomhdMPLEGc-s',
        _score: 1,
        _source: {
          agent: {
            id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            type: 'endpoint',
            version: '8.15.1',
          },
          process: {
            parent: {
              entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTEtMTcyNjQ4NDM0NQ==',
            },
            name: 'systemd-journald',
            pid: 217,
            entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTIxNy0xNzI2NDg0MzQ4',
            executable: '/usr/lib/systemd/systemd-journald',
          },
          message: 'Endpoint file event',
          '@timestamp': '2024-10-16T11:06:12.2195128Z',
          file: {
            path: '/run/systemd/journal/streams/8:5203253',
            name: '8:5203253',
          },
          ecs: {
            version: '8.10.0',
          },
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.events.file',
          },
          elastic: {
            agent: {
              id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            },
          },
          host: {
            hostname: 'endpoint-complete-deb-gd-1',
            os: {
              Ext: {
                variant: 'Debian',
              },
              kernel: '6.1.0-25-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.106-3 (2024-08-26)',
              name: 'Linux',
              family: 'debian',
              type: 'linux',
              version: '12.7',
              platform: 'debian',
              full: 'Debian 12.7',
            },
            ip: ['127.0.0.1', '::1', '10.142.0.11', 'fe80::4001:aff:fe8e:b'],
            name: 'endpoint-complete-deb-gd-1',
            id: '18a77774a51b4024813da8493f10c056',
            mac: ['42-01-0a-8e-00-0b'],
            architecture: 'x86_64',
          },
          event: {
            agent_id_status: 'verified',
            sequence: 2524799,
            ingested: '2024-10-16T11:06:35Z',
            created: '2024-10-16T11:06:12.2195128Z',
            kind: 'event',
            module: 'endpoint',
            action: 'deletion',
            id: 'NiUEE6P7Pv00Sp1S++++9q6Y',
            category: ['file'],
            type: ['deletion'],
            dataset: 'endpoint.events.file',
            outcome: 'unknown',
          },
          user: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
          group: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
        },
      },
      {
        _index: '.ds-logs-endpoint.events.file-default-2024.09.16-000001',
        _id: 'jGj4lJIBomhdMPLEbM2r',
        _score: 1,
        _source: {
          agent: {
            id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            type: 'endpoint',
            version: '8.15.1',
          },
          process: {
            name: 'systemd',
            pid: 1,
            entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTEtMTcyNjQ4NDM0NQ==',
            executable: '/usr/lib/systemd/systemd',
          },
          message: 'Endpoint file event',
          '@timestamp': '2024-10-16T10:55:54.5240803Z',
          file: {
            Ext: {
              original: {
                path: '/run/systemd/units/.#invocation:gce-workload-cert-refresh.servicee6f43c6db49deb4c',
                extension: 'servicee6f43c6db49deb4c',
                name: '.#invocation:gce-workload-cert-refresh.servicee6f43c6db49deb4c',
              },
            },
            path: '/run/systemd/units/invocation:gce-workload-cert-refresh.service',
            extension: 'service',
            name: 'invocation:gce-workload-cert-refresh.service',
          },
          ecs: {
            version: '8.10.0',
          },
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.events.file',
          },
          elastic: {
            agent: {
              id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            },
          },
          host: {
            hostname: 'endpoint-complete-deb-gd-1',
            os: {
              Ext: {
                variant: 'Debian',
              },
              kernel: '6.1.0-25-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.106-3 (2024-08-26)',
              name: 'Linux',
              family: 'debian',
              type: 'linux',
              version: '12.7',
              platform: 'debian',
              full: 'Debian 12.7',
            },
            ip: ['127.0.0.1', '::1', '10.142.0.11', 'fe80::4001:aff:fe8e:b'],
            name: 'endpoint-complete-deb-gd-1',
            id: '18a77774a51b4024813da8493f10c056',
            mac: ['42-01-0a-8e-00-0b'],
            architecture: 'x86_64',
          },
          event: {
            agent_id_status: 'verified',
            sequence: 2524637,
            ingested: '2024-10-16T10:56:01Z',
            created: '2024-10-16T10:55:54.5240803Z',
            kind: 'event',
            module: 'endpoint',
            action: 'rename',
            id: 'NiUEE6P7Pv00Sp1S++++9q35',
            category: ['file'],
            type: ['change'],
            dataset: 'endpoint.events.file',
            outcome: 'unknown',
          },
          user: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
          group: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
        },
      },
      {
        _index: '.ds-logs-endpoint.events.file-default-2024.09.16-000001',
        _id: 'j2j4lJIBomhdMPLEbM2r',
        _score: 1,
        _source: {
          agent: {
            id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            type: 'endpoint',
            version: '8.15.1',
          },
          process: {
            parent: {
              entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTEtMTcyNjQ4NDM0NQ==',
            },
            name: 'systemd-journald',
            pid: 217,
            entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTIxNy0xNzI2NDg0MzQ4',
            executable: '/usr/lib/systemd/systemd-journald',
          },
          message: 'Endpoint file event',
          '@timestamp': '2024-10-16T10:55:54.5526557Z',
          file: {
            path: '/run/systemd/journal/streams/.#8:5203091bcpcW7',
            name: '.#8:5203091bcpcW7',
          },
          ecs: {
            version: '8.10.0',
          },
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.events.file',
          },
          elastic: {
            agent: {
              id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            },
          },
          host: {
            hostname: 'endpoint-complete-deb-gd-1',
            os: {
              Ext: {
                variant: 'Debian',
              },
              kernel: '6.1.0-25-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.106-3 (2024-08-26)',
              name: 'Linux',
              family: 'debian',
              type: 'linux',
              version: '12.7',
              platform: 'debian',
              full: 'Debian 12.7',
            },
            ip: ['127.0.0.1', '::1', '10.142.0.11', 'fe80::4001:aff:fe8e:b'],
            name: 'endpoint-complete-deb-gd-1',
            id: '18a77774a51b4024813da8493f10c056',
            mac: ['42-01-0a-8e-00-0b'],
            architecture: 'x86_64',
          },
          event: {
            agent_id_status: 'verified',
            sequence: 2524642,
            ingested: '2024-10-16T10:56:01Z',
            created: '2024-10-16T10:55:54.5526557Z',
            kind: 'event',
            module: 'endpoint',
            action: 'creation',
            id: 'NiUEE6P7Pv00Sp1S++++9q3D',
            category: ['file'],
            type: ['creation'],
            dataset: 'endpoint.events.file',
            outcome: 'unknown',
          },
          user: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
          group: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
        },
      },
      {
        _index: '.ds-logs-endpoint.events.file-default-2024.09.16-000001',
        _id: 'kGj4lJIBomhdMPLEbM2r',
        _score: 1,
        _source: {
          agent: {
            id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            type: 'endpoint',
            version: '8.15.1',
          },
          process: {
            parent: {
              entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTEtMTcyNjQ4NDM0NQ==',
            },
            name: 'systemd-journald',
            pid: 217,
            entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTIxNy0xNzI2NDg0MzQ4',
            executable: '/usr/lib/systemd/systemd-journald',
          },
          message: 'Endpoint file event',
          '@timestamp': '2024-10-16T10:55:54.5527354Z',
          file: {
            Ext: {
              original: {
                path: '/run/systemd/journal/streams/.#8:5203091bcpcW7',
                name: '.#8:5203091bcpcW7',
              },
            },
            path: '/run/systemd/journal/streams/8:5203091',
            name: '8:5203091',
          },
          ecs: {
            version: '8.10.0',
          },
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.events.file',
          },
          elastic: {
            agent: {
              id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            },
          },
          host: {
            hostname: 'endpoint-complete-deb-gd-1',
            os: {
              Ext: {
                variant: 'Debian',
              },
              kernel: '6.1.0-25-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.106-3 (2024-08-26)',
              name: 'Linux',
              family: 'debian',
              type: 'linux',
              version: '12.7',
              platform: 'debian',
              full: 'Debian 12.7',
            },
            ip: ['127.0.0.1', '::1', '10.142.0.11', 'fe80::4001:aff:fe8e:b'],
            name: 'endpoint-complete-deb-gd-1',
            id: '18a77774a51b4024813da8493f10c056',
            mac: ['42-01-0a-8e-00-0b'],
            architecture: 'x86_64',
          },
          event: {
            agent_id_status: 'verified',
            sequence: 2524643,
            ingested: '2024-10-16T10:56:01Z',
            created: '2024-10-16T10:55:54.5527354Z',
            kind: 'event',
            module: 'endpoint',
            action: 'rename',
            id: 'NiUEE6P7Pv00Sp1S++++9q3E',
            category: ['file'],
            type: ['change'],
            dataset: 'endpoint.events.file',
            outcome: 'unknown',
          },
          user: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
          group: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
        },
      },
      {
        _index: '.ds-logs-endpoint.events.file-default-2024.09.16-000001',
        _id: 'lGj4lJIBomhdMPLEbM2r',
        _score: 1,
        _source: {
          agent: {
            id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            type: 'endpoint',
            version: '8.15.1',
          },
          process: {
            name: 'systemd',
            pid: 1,
            entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTEtMTcyNjQ4NDM0NQ==',
            executable: '/usr/lib/systemd/systemd',
          },
          message: 'Endpoint file event',
          '@timestamp': '2024-10-16T10:55:54.5694977Z',
          file: {
            path: '/run/systemd/units/invocation:gce-workload-cert-refresh.service',
            extension: 'service',
            name: 'invocation:gce-workload-cert-refresh.service',
          },
          ecs: {
            version: '8.10.0',
          },
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.events.file',
          },
          elastic: {
            agent: {
              id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            },
          },
          host: {
            hostname: 'endpoint-complete-deb-gd-1',
            os: {
              Ext: {
                variant: 'Debian',
              },
              kernel: '6.1.0-25-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.106-3 (2024-08-26)',
              name: 'Linux',
              family: 'debian',
              type: 'linux',
              version: '12.7',
              platform: 'debian',
              full: 'Debian 12.7',
            },
            ip: ['127.0.0.1', '::1', '10.142.0.11', 'fe80::4001:aff:fe8e:b'],
            name: 'endpoint-complete-deb-gd-1',
            id: '18a77774a51b4024813da8493f10c056',
            mac: ['42-01-0a-8e-00-0b'],
            architecture: 'x86_64',
          },
          event: {
            agent_id_status: 'verified',
            sequence: 2524650,
            ingested: '2024-10-16T10:56:01Z',
            created: '2024-10-16T10:55:54.5694977Z',
            kind: 'event',
            module: 'endpoint',
            action: 'deletion',
            id: 'NiUEE6P7Pv00Sp1S++++9q3N',
            category: ['file'],
            type: ['deletion'],
            dataset: 'endpoint.events.file',
            outcome: 'unknown',
          },
          user: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
          group: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
        },
      },
      {
        _index: '.ds-logs-endpoint.events.file-default-2024.09.16-000001',
        _id: 'lWj4lJIBomhdMPLEbM2r',
        _score: 1,
        _source: {
          agent: {
            id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            type: 'endpoint',
            version: '8.15.1',
          },
          process: {
            parent: {
              entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTEtMTcyNjQ4NDM0NQ==',
            },
            name: 'systemd-journald',
            pid: 217,
            entity_id: 'ZjA1MzFmYTYtZjI1Yy00NmQ5LTgxNWEtOTMzM2IyNWJhNzI4LTIxNy0xNzI2NDg0MzQ4',
            executable: '/usr/lib/systemd/systemd-journald',
          },
          message: 'Endpoint file event',
          '@timestamp': '2024-10-16T10:55:54.5710352Z',
          file: {
            path: '/run/systemd/journal/streams/8:5203091',
            name: '8:5203091',
          },
          ecs: {
            version: '8.10.0',
          },
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.events.file',
          },
          elastic: {
            agent: {
              id: 'f0531fa6-f25c-46d9-815a-9333b25ba728',
            },
          },
          host: {
            hostname: 'endpoint-complete-deb-gd-1',
            os: {
              Ext: {
                variant: 'Debian',
              },
              kernel: '6.1.0-25-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.106-3 (2024-08-26)',
              name: 'Linux',
              family: 'debian',
              type: 'linux',
              version: '12.7',
              platform: 'debian',
              full: 'Debian 12.7',
            },
            ip: ['127.0.0.1', '::1', '10.142.0.11', 'fe80::4001:aff:fe8e:b'],
            name: 'endpoint-complete-deb-gd-1',
            id: '18a77774a51b4024813da8493f10c056',
            mac: ['42-01-0a-8e-00-0b'],
            architecture: 'x86_64',
          },
          event: {
            agent_id_status: 'verified',
            sequence: 2524651,
            ingested: '2024-10-16T10:56:01Z',
            created: '2024-10-16T10:55:54.5710352Z',
            kind: 'event',
            module: 'endpoint',
            action: 'deletion',
            id: 'NiUEE6P7Pv00Sp1S++++9q3P',
            category: ['file'],
            type: ['deletion'],
            dataset: 'endpoint.events.file',
            outcome: 'unknown',
          },
          user: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
          group: {
            Ext: {
              real: {
                name: 'root',
                id: 0,
              },
            },
            name: 'root',
            id: 0,
          },
        },
      },
    ],
  },
};
