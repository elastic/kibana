/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const browserFields = {
  host: {
    fields: {
      'host.name': {
        category: 'host',
        description:
          'Name of the host. It can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
        name: 'host.name',
        type: 'string',
        searchable: true,
        aggregatable: true,
        format: 'string',
        indexes: [
          'apm-*-transaction*',
          'traces-apm*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'winlogbeat-*',
        ],
      },
    },
  },
};

export const columns = [
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Host Name',
    id: 'host.name',
    initialWidth: 30,
  },
];

export const data = [
  [
    {
      field: 'kibana.alert.rule.updated_by',
      value: ['elastic'],
    },
    {
      field: 'host.os.name.text',
      value: ['Debian GNU/Linux'],
    },
    {
      field: 'host.hostname',
      value: ['bastion00'],
    },
    {
      field: 'host.mac',
      value: ['42-01-0A-C8-00-2E'],
    },
    {
      field: 'service.type',
      value: ['system'],
    },
    {
      field: 'signal.rule.enabled',
      value: ['true'],
    },
    {
      field: 'host.os.version',
      value: ['10 (buster)'],
    },
    {
      field: 'signal.rule.max_signals',
      value: [100],
    },
    {
      field: 'source.geo.region_name',
      value: ['Iowa'],
    },
    {
      field: 'signal.rule.updated_at',
      value: ['2023-04-25T09:03:13.384Z'],
    },
    {
      field: 'kibana.alert.risk_score',
      value: [21],
    },
    {
      field: 'source.geo.city_name',
      value: ['Council Bluffs'],
    },
    {
      field: 'host.os.type',
      value: ['linux'],
    },
    {
      field: 'signal.original_event.end',
      value: ['2022-10-14T14:00:24.296Z'],
    },
    {
      field: 'kibana.alert.original_event.module',
      value: ['system'],
    },
    {
      field: 'kibana.alert.rule.interval',
      value: ['5m'],
    },
    {
      field: 'kibana.alert.rule.type',
      value: ['query'],
    },
    {
      field: 'agent.hostname',
      value: ['bastion00.siem.estc.dev'],
    },
    {
      field: 'kibana.alert.original_event.end',
      value: ['2022-10-14T14:00:24.296Z'],
    },
    {
      field: 'kibana.alert.rule.immutable',
      value: ['false'],
    },
    {
      field: 'source.port',
      value: [56296],
    },
    {
      field: 'client.port',
      value: [56296],
    },
    {
      field: 'host.containerized',
      value: [false],
    },
    {
      field: 'destination.bytes',
      value: [6564],
    },
    {
      field: 'kibana.alert.rule.version',
      value: ['1'],
    },
    {
      field: 'source.as.number',
      value: [396982],
    },
    {
      field: 'event.end',
      value: ['2022-10-14T14:00:24.296Z'],
    },
    {
      field: 'process.entity_id',
      value: ['rR78V6MnxUY7Go9O'],
    },
    {
      field: 'host.ip',
      value: ['10.200.0.46', 'fe80::4001:aff:fec8:2e'],
    },
    {
      field: 'agent.type',
      value: ['auditbeat'],
    },
    {
      field: 'signal.original_event.category',
      value: ['network'],
    },
    {
      field: 'process.executable.text',
      value: ['/usr/local/bin/traefik'],
    },
    {
      field: 'related.ip',
      value: ['10.200.0.46', '35.226.77.71'],
    },
    {
      field: 'server.port',
      value: [9200],
    },
    {
      field: 'host.id',
      value: ['a415f7ec8a9af33894317958f24e185f'],
    },
    {
      field: 'timestamp',
      value: [1666873459714],
    },
    {
      field: 'signal.rule.building_block_type',
      value: ['default'],
    },
    {
      field: 'kibana.alert.rule.indices',
      value: [
        'apm-*-transaction*',
        'auditbeat-*',
        'endgame-*',
        'filebeat-*',
        'logs-*',
        'packetbeat-*',
        'traces-apm*',
        'winlogbeat-*',
        '-*elastic-cloud-logs-*',
      ],
    },
    {
      field: 'signal.rule.updated_by',
      value: ['elastic'],
    },
    {
      field: 'cloud.account.id',
      value: ['elastic-siem'],
    },
    {
      field: 'host.os.platform',
      value: ['debian'],
    },
    {
      field: 'kibana.alert.rule.severity',
      value: ['low'],
    },
    {
      field: 'signal.original_event.duration',
      value: ['647874250'],
    },
    {
      field: 'kibana.version',
      value: ['8.8.0'],
    },
    {
      field: 'signal.ancestors.type',
      value: ['event', 'signal'],
    },
    {
      field: 'cloud.instance.name',
      value: ['bastion00'],
    },
    {
      field: 'user.name.text',
      value: ['traefik'],
    },
    {
      field: 'kibana.alert.ancestors.id',
      value: [
        '4z_L1oMBiIcG4Y9J2nxd',
        '75e2a3903daac549c05eb3aebe90b3ef6d1921b74c4870ee518643a46f778a31',
      ],
    },
    {
      field: 'kibana.alert.rule.building_block_type',
      value: ['default'],
    },
    {
      field: 'process.name.text',
      value: ['traefik'],
    },
    {
      field: 'kibana.alert.rule.description',
      value: ['Custom Rule'],
    },
    {
      field: 'kibana.alert.rule.producer',
      value: ['siem'],
    },
    {
      field: 'kibana.alert.rule.to',
      value: ['now'],
    },
    {
      field: 'signal.rule.id',
      value: ['023a0260-e348-11ed-bd43-632e972150d6'],
    },
    {
      field: 'system.audit.socket.uid',
      value: [1018],
    },
    {
      field: 'signal.rule.risk_score',
      value: [21],
    },
    {
      field: 'signal.reason',
      value: [
        'network event with process traefik, source 35.226.77.71:56296, destination 10.200.0.46:9200, by traefik on bastion00.siem.estc.dev created low alert Custom Rule.',
      ],
    },
    {
      field: 'process.created',
      value: ['2022-01-31T13:14:05.210Z'],
    },
    {
      field: 'user.risk.calculated_score_norm',
      value: [31.238997],
    },
    {
      field: 'host.os.name',
      value: ['Debian GNU/Linux'],
    },
    {
      field: 'signal.status',
      value: ['open'],
    },
    {
      field: 'client.as.organization.name.text',
      value: ['GOOGLE-CLOUD-PLATFORM'],
    },
    {
      field: 'flow.final',
      value: [true],
    },
    {
      field: 'kibana.alert.rule.uuid',
      value: ['023a0260-e348-11ed-bd43-632e972150d6'],
    },
    {
      field: 'kibana.alert.original_event.category',
      value: ['network'],
    },
    {
      field: 'client.ip',
      value: ['35.226.77.71'],
    },
    {
      field: 'process.name',
      value: ['traefik'],
    },
    {
      field: 'client.as.number',
      value: [396982],
    },
    {
      field: 'kibana.alert.ancestors.index',
      value: ['.ds-auditbeat-8.5.0-2022.10.03-000001', 'auditbeat-bulk'],
    },
    {
      field: 'agent.version',
      value: ['8.5.0'],
    },
    {
      field: 'host.os.family',
      value: ['debian'],
    },
    {
      field: 'kibana.alert.rule.from',
      value: ['now-6000000300s'],
    },
    {
      field: 'kibana.alert.rule.parameters',
      value: [
        {
          description: 'Custom Rule',
          risk_score: 21,
          severity: 'low',
          building_block_type: 'default',
          license: '',
          meta: {
            from: '100000000m',
            kibana_siem_app_url: 'http://localhost:5601/app/security',
          },
          author: [],
          false_positives: [],
          from: 'now-6000000300s',
          rule_id: 'caf0db0c-c7e2-455e-89b8-6b0d73619ae5',
          max_signals: 100,
          risk_score_mapping: [],
          severity_mapping: [],
          threat: [],
          to: 'now',
          references: [],
          version: 1,
          exceptions_list: [],
          immutable: false,
          related_integrations: [],
          required_fields: [],
          setup: '',
          type: 'query',
          language: 'kuery',
          index: [
            'apm-*-transaction*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'traces-apm*',
            'winlogbeat-*',
            '-*elastic-cloud-logs-*',
          ],
          query: '*',
          filters: [],
        },
      ],
    },
    {
      field: 'signal.original_event.kind',
      value: ['signal'],
    },
    {
      field: 'client.packets',
      value: [10],
    },
    {
      field: 'group.id',
      value: ['1019'],
    },
    {
      field: 'signal.depth',
      value: [2],
    },
    {
      field: 'kibana.alert.original_event.start',
      value: ['2022-10-14T14:00:23.649Z'],
    },
    {
      field: 'signal.rule.immutable',
      value: ['false'],
    },
    {
      field: 'signal.rule.name',
      value: ['Custom Rule'],
    },
    {
      field: 'event.module',
      value: ['system'],
    },
    {
      field: 'host.os.kernel',
      value: ['4.19.0-17-cloud-amd64'],
    },
    {
      field: 'kibana.alert.rule.license',
      value: [''],
    },
    {
      field: 'kibana.alert.original_event.kind',
      value: ['signal'],
    },
    {
      field: 'network.type',
      value: ['ipv4'],
    },
    {
      field: 'source.as.organization.name.text',
      value: ['GOOGLE-CLOUD-PLATFORM'],
    },
    {
      field: 'signal.rule.description',
      value: ['Custom Rule'],
    },
    {
      field: 'source.geo.continent_name',
      value: ['North America'],
    },
    {
      field: 'source.as.organization.name',
      value: ['GOOGLE-CLOUD-PLATFORM'],
    },
    {
      field: 'process.args',
      value: ['/usr/local/bin/traefik', '--configfile=/etc/traefik/traefik.yml'],
    },
    {
      field: 'client.bytes',
      value: [1495],
    },
    {
      field: 'kibana.space_ids',
      value: ['default'],
    },
    {
      field: 'flow.complete',
      value: [true],
    },
    {
      field: 'kibana.alert.severity',
      value: ['low'],
    },
    {
      field: 'signal.ancestors.depth',
      value: [0, 1],
    },
    {
      field: 'event.category',
      value: ['network'],
    },
    {
      field: 'host.risk.calculated_score_norm',
      value: [17.08461],
    },
    {
      field: 'client.geo.country_iso_code',
      value: ['US'],
    },
    {
      field: 'kibana.alert.ancestors.depth',
      value: [0, 1],
    },
    {
      field: 'source.ip',
      value: ['35.226.77.71'],
    },
    {
      field: 'agent.name',
      value: ['bastion00.siem.estc.dev'],
    },
    {
      field: 'network.community_id',
      value: ['1:IjFQUo1K34NyjD8pxAitVL9mqdw='],
    },
    {
      field: 'system.audit.socket.euid',
      value: [1018],
    },
    {
      field: 'group.name',
      value: ['traefik'],
    },
    {
      field: 'source.packets',
      value: [10],
    },
    {
      field: 'user.id',
      value: ['1018'],
    },
    {
      field: 'system.audit.socket.gid',
      value: [1019],
    },
    {
      field: 'related.user',
      value: ['traefik'],
    },
    {
      field: 'host.architecture',
      value: ['x86_64'],
    },
    {
      field: 'kibana.alert.start',
      value: ['2023-04-25T09:03:15.535Z'],
    },
    {
      field: 'cloud.provider',
      value: ['gcp'],
    },
    {
      field: 'cloud.machine.type',
      value: ['e2-small'],
    },
    {
      field: 'kibana.alert.original_event.type',
      value: ['info', 'connection'],
    },
    {
      field: 'signal.original_event.module',
      value: ['system'],
    },
    {
      field: 'agent.id',
      value: ['bb1e5c8f-10ba-48b0-bee1-da60886ba59c'],
    },
    {
      field: 'signal.rule.from',
      value: ['now-6000000300s'],
    },
    {
      field: 'kibana.alert.rule.enabled',
      value: ['true'],
    },
    {
      field: 'signal.original_event.start',
      value: ['2022-10-14T14:00:23.649Z'],
    },
    {
      field: 'event.start',
      value: ['2022-10-14T14:00:23.649Z'],
    },
    {
      field: 'kibana.alert.ancestors.type',
      value: ['event', 'signal'],
    },
    {
      field: 'destination.port',
      value: [9200],
    },
    {
      field: 'user.name',
      value: ['traefik'],
    },
    {
      field: 'signal.ancestors.index',
      value: ['.ds-auditbeat-8.5.0-2022.10.03-000001', 'auditbeat-bulk'],
    },
    {
      field: 'destination.packets',
      value: [9],
    },
    {
      field: 'kibana.alert.original_event.duration',
      value: ['647874250'],
    },
    {
      field: 'cloud.instance.id',
      value: ['2730026390719231438'],
    },
    {
      field: 'client.geo.region_name',
      value: ['Iowa'],
    },
    {
      field: 'signal.original_event.type',
      value: ['info', 'connection'],
    },
    {
      field: 'kibana.alert.rule.max_signals',
      value: [100],
    },
    {
      field: 'kibana.alert.rule.risk_score',
      value: [21],
    },
    {
      field: 'host.os.codename',
      value: ['buster'],
    },
    {
      field: 'signal.original_event.dataset',
      value: ['socket'],
    },
    {
      field: 'kibana.alert.rule.consumer',
      value: ['siem'],
    },
    {
      field: 'destination.ip',
      value: ['10.200.0.46'],
    },
    {
      field: 'kibana.alert.rule.category',
      value: ['Custom Query Rule'],
    },
    {
      field: 'event.duration',
      value: [647874250],
    },
    {
      field: 'event.action',
      value: ['exec'],
    },
    {
      field: '@timestamp',
      value: ['2023-04-25T09:03:15.516Z'],
    },
    {
      field: 'kibana.alert.original_event.action',
      value: ['exec'],
    },
    {
      field: 'host.risk.calculated_level',
      value: ['Unknown'],
    },
    {
      field: 'agent.ephemeral_id',
      value: ['71eae441-3269-4828-9496-99a6fd42cb91'],
    },
    {
      field: 'kibana.alert.rule.execution.uuid',
      value: ['3e763264-9eab-4c6b-98e8-d51367491275'],
    },
    {
      field: 'kibana.alert.uuid',
      value: ['7d3194c7158fb9edb10541ccdd81f8c2b9c9d3c50b82c14457c959a2fcbcb22a'],
    },
    {
      field: 'kibana.alert.rule.meta.kibana_siem_app_url',
      value: ['http://localhost:5601/app/security'],
    },
    {
      field: 'signal.rule.license',
      value: [''],
    },
    {
      field: 'kibana.alert.rule.rule_id',
      value: ['caf0db0c-c7e2-455e-89b8-6b0d73619ae5'],
    },
    {
      field: 'kibana.alert.ancestors.rule',
      value: ['532e0020-4a0c-11ed-9aa3-574e520c127d'],
    },
    {
      field: 'cloud.project.id',
      value: ['elastic-siem'],
    },
    {
      field: 'signal.rule.type',
      value: ['query'],
    },
    {
      field: 'server.ip',
      value: ['10.200.0.46'],
    },
    {
      field: 'user.risk.calculated_level',
      value: ['Low'],
    },
    {
      field: 'kibana.alert.url',
      value: [
        'http://localhost:5601/app/security/alerts/redirect/7d3194c7158fb9edb10541ccdd81f8c2b9c9d3c50b82c14457c959a2fcbcb22a?index=.alerts-security.alerts-default&timestamp=2023-04-25T09:03:15.516Z',
      ],
    },
    {
      field: 'kibana.alert.building_block_type',
      value: ['default'],
    },
    {
      field: 'process.pid',
      value: [31349],
    },
    {
      field: 'system.audit.socket.egid',
      value: [1019],
    },
    {
      field: 'signal.rule.interval',
      value: ['5m'],
    },
    {
      field: 'cloud.availability_zone',
      value: ['us-central1-c'],
    },
    {
      field: 'signal.rule.created_by',
      value: ['elastic'],
    },
    {
      field: 'kibana.alert.rule.created_by',
      value: ['elastic'],
    },
    {
      field: 'system.audit.socket.kernel_sock_address',
      value: ['0xffff97d5d9608900'],
    },
    {
      field: 'kibana.alert.rule.name',
      value: ['Custom Rule'],
    },
    {
      field: 'client.as.organization.name',
      value: ['GOOGLE-CLOUD-PLATFORM'],
    },
    {
      field: 'host.name',
      value: ['bastion00.siem.estc.dev'],
    },
    {
      field: 'client.geo.country_name',
      value: ['United States'],
    },
    {
      field: 'source.geo.region_iso_code',
      value: ['US-IA'],
    },
    {
      field: 'event.kind',
      value: ['signal'],
    },
    {
      field: 'signal.rule.created_at',
      value: ['2023-04-25T09:03:13.384Z'],
    },
    {
      field: 'kibana.alert.workflow_status',
      value: ['open'],
    },
    {
      field: 'network.packets',
      value: [19],
    },
    {
      field: 'kibana.alert.reason',
      value: [
        'network event with process traefik, source 35.226.77.71:56296, destination 10.200.0.46:9200, by traefik on bastion00.siem.estc.dev created low alert Custom Rule.',
      ],
    },
    {
      field: 'signal.ancestors.id',
      value: [
        '4z_L1oMBiIcG4Y9J2nxd',
        '75e2a3903daac549c05eb3aebe90b3ef6d1921b74c4870ee518643a46f778a31',
      ],
    },
    {
      field: 'signal.original_time',
      value: ['2022-10-27T12:24:19.714Z'],
    },
    {
      field: 'cloud.service.name',
      value: ['GCE'],
    },
    {
      field: 'ecs.version',
      value: ['8.0.0'],
    },
    {
      field: 'signal.rule.severity',
      value: ['low'],
    },
    {
      field: 'kibana.alert.depth',
      value: [2],
    },
    {
      field: 'kibana.alert.rule.revision',
      value: [0],
    },
    {
      field: 'signal.rule.version',
      value: ['1'],
    },
    {
      field: 'client.geo.continent_name',
      value: ['North America'],
    },
    {
      field: 'server.bytes',
      value: [6564],
    },
    {
      field: 'kibana.alert.status',
      value: ['active'],
    },
    {
      field: 'kibana.alert.last_detected',
      value: ['2023-04-25T09:03:15.535Z'],
    },
    {
      field: 'kibana.alert.original_event.dataset',
      value: ['socket'],
    },
    {
      field: 'kibana.alert.rule.rule_type_id',
      value: ['siem.queryRule'],
    },
    {
      field: 'signal.rule.rule_id',
      value: ['caf0db0c-c7e2-455e-89b8-6b0d73619ae5'],
    },
    {
      field: 'source.geo.country_iso_code',
      value: ['US'],
    },
    {
      field: 'network.bytes',
      value: [8059],
    },
    {
      field: 'network.direction',
      value: ['ingress'],
    },
    {
      field: 'process.executable',
      value: ['/usr/local/bin/traefik'],
    },
    {
      field: 'source.bytes',
      value: [1495],
    },
    {
      field: 'client.geo.city_name',
      value: ['Council Bluffs'],
    },
    {
      field: 'client.geo.region_iso_code',
      value: ['US-IA'],
    },
    {
      field: 'kibana.alert.rule.updated_at',
      value: ['2023-04-25T09:03:13.384Z'],
    },
    {
      field: 'server.packets',
      value: [9],
    },
    {
      field: 'network.transport',
      value: ['tcp'],
    },
    {
      field: 'signal.original_event.action',
      value: ['exec'],
    },
    {
      field: 'kibana.alert.rule.created_at',
      value: ['2023-04-25T09:03:13.384Z'],
    },
    {
      field: 'signal.rule.to',
      value: ['now'],
    },
    {
      field: 'event.type',
      value: ['info', 'connection'],
    },
    {
      field: 'process.entry_leader.entity_id',
      value: ['some99'],
    },
    {
      field: 'source.geo.country_name',
      value: ['United States'],
    },
    {
      field: 'kibana.alert.rule.meta.from',
      value: ['100000000m'],
    },
    {
      field: 'event.dataset',
      value: ['socket'],
    },
    {
      field: 'kibana.alert.original_time',
      value: ['2022-10-27T12:24:19.714Z'],
    },
    {
      field: '_id',
      value: '7d3194c7158fb9edb10541ccdd81f8c2b9c9d3c50b82c14457c959a2fcbcb22a',
    },
    {
      field: '_index',
      value: '.internal.alerts-security.alerts-default-000001',
    },
  ],
  [
    {
      field: 'kibana.alert.severity',
      value: ['low'],
    },
    {
      field: 'host.os.full.text',
      value: ['Windows Server 2019 Datacenter 1809 (10.0.17763.3406)'],
    },
    {
      field: 'kibana.alert.rule.updated_by',
      value: ['elastic'],
    },
    {
      field: 'signal.ancestors.depth',
      value: [0, 1],
    },
    {
      field: 'event.category',
      value: ['file'],
    },
    {
      field: 'host.risk.calculated_score_norm',
      value: [31.092354],
    },
    {
      field: 'host.os.name.text',
      value: ['Windows'],
    },
    {
      field: 'process.parent.pid',
      value: [652],
    },
    {
      field: 'host.hostname',
      value: ['siem-windows-endpoint'],
    },
    {
      field: 'signal.original_event.created',
      value: ['2022-10-14T14:00:27.258Z'],
    },
    {
      field: 'host.mac',
      value: ['42:01:0a:c8:00:df'],
    },
    {
      field: 'process.code_signature.exists',
      value: [true],
    },
    {
      field: 'elastic.agent.id',
      value: ['2ea4b363-6a3f-449e-9d4e-c73ccf28f693'],
    },
    {
      field: 'kibana.alert.ancestors.depth',
      value: [0, 1],
    },
    {
      field: 'signal.rule.enabled',
      value: ['true'],
    },
    {
      field: 'host.os.version',
      value: ['1809 (10.0.17763.3406)'],
    },
    {
      field: 'signal.rule.max_signals',
      value: [100],
    },
    {
      field: 'signal.rule.updated_at',
      value: ['2023-04-25T09:03:13.384Z'],
    },
    {
      field: 'kibana.alert.risk_score',
      value: [21],
    },
    {
      field: 'event.agent_id_status',
      value: ['verified'],
    },
    {
      field: 'kibana.alert.original_event.id',
      value: ['MnfiZLkz1DywMGBf++++9ApC'],
    },
    {
      field: 'file.path.text',
      value: ['C:\\ProgramData\\winlogbeat\\.winlogbeat.yml.new'],
    },
    {
      field: 'host.os.type',
      value: ['windows'],
    },
    {
      field: 'user.id',
      value: ['S-1-5-18'],
    },
    {
      field: 'process.Ext.ancestry',
      value: [
        'MmVhNGIzNjMtNmEzZi00NDllLTlkNGUtYzczY2NmMjhmNjkzLTY1Mi0xNjY0ODA2NTI4Ljc4NTg5NTAw',
        'MmVhNGIzNjMtNmEzZi00NDllLTlkNGUtYzczY2NmMjhmNjkzLTUzNi0xNjY0ODA2NTI3LjEwNDI2NTQwMA==',
      ],
    },
    {
      field: 'kibana.alert.original_event.module',
      value: ['endpoint'],
    },
    {
      field: 'kibana.alert.rule.interval',
      value: ['5m'],
    },
    {
      field: 'kibana.alert.rule.type',
      value: ['query'],
    },
    {
      field: 'signal.original_event.sequence',
      value: [940441],
    },
    {
      field: 'host.architecture',
      value: ['x86_64'],
    },
    {
      field: 'kibana.alert.start',
      value: ['2023-04-25T09:03:15.535Z'],
    },
    {
      field: 'kibana.alert.rule.immutable',
      value: ['false'],
    },
    {
      field: 'process.Ext.code_signature.status',
      value: ['trusted'],
    },
    {
      field: 'kibana.alert.original_event.type',
      value: ['creation'],
    },
    {
      field: 'signal.original_event.module',
      value: ['endpoint'],
    },
    {
      field: 'agent.id',
      value: ['2ea4b363-6a3f-449e-9d4e-c73ccf28f693'],
    },
    {
      field: 'signal.rule.from',
      value: ['now-6000000300s'],
    },
    {
      field: 'kibana.alert.rule.enabled',
      value: ['true'],
    },
    {
      field: 'kibana.alert.rule.version',
      value: ['1'],
    },
    {
      field: 'kibana.alert.ancestors.type',
      value: ['event', 'signal'],
    },
    {
      field: 'file.Ext.windows.zone_identifier',
      value: [-1],
    },
    {
      field: 'user.name',
      value: ['SYSTEM'],
    },
    {
      field: 'signal.ancestors.index',
      value: ['.ds-logs-endpoint.events.file-default-2022.10.08-000003', 'auditbeat-bulk'],
    },
    {
      field: 'process.entity_id',
      value: [
        'MmVhNGIzNjMtNmEzZi00NDllLTlkNGUtYzczY2NmMjhmNjkzLTE3MDQtMTY2NDgwNjcwNi4yODUzODk4MDA=',
      ],
    },
    {
      field: 'host.ip',
      value: ['10.200.0.223', 'fe80::eda9:848c:24ae:431d', '127.0.0.1', '::1'],
    },
    {
      field: 'agent.type',
      value: ['endpoint'],
    },
    {
      field: 'signal.original_event.category',
      value: ['file'],
    },
    {
      field: 'process.executable.text',
      value: ['C:\\Program Files\\Winlogbeat\\winlogbeat.exe'],
    },
    {
      field: 'signal.original_event.id',
      value: ['MnfiZLkz1DywMGBf++++9ApC'],
    },
    {
      field: 'user.domain',
      value: ['NT AUTHORITY'],
    },
    {
      field: 'host.id',
      value: ['526e76a2-1c82-4245-a179-4fcde1e608fc'],
    },
    {
      field: 'process.Ext.code_signature.subject_name',
      value: ['Elasticsearch, Inc.'],
    },
    {
      field: 'timestamp',
      value: [1666873459714],
    },
    {
      field: 'signal.original_event.type',
      value: ['creation'],
    },
    {
      field: 'kibana.alert.rule.max_signals',
      value: [100],
    },
    {
      field: 'kibana.alert.rule.risk_score',
      value: [21],
    },
    {
      field: 'file.name',
      value: ['.winlogbeat.yml.new'],
    },
    {
      field: 'signal.rule.building_block_type',
      value: ['default'],
    },
    {
      field: 'process.code_signature.status',
      value: ['trusted'],
    },
    {
      field: 'signal.original_event.dataset',
      value: ['endpoint.events.file'],
    },
    {
      field: 'kibana.alert.rule.consumer',
      value: ['siem'],
    },
    {
      field: 'kibana.alert.rule.indices',
      value: [
        'apm-*-transaction*',
        'auditbeat-*',
        'endgame-*',
        'filebeat-*',
        'logs-*',
        'packetbeat-*',
        'traces-apm*',
        'winlogbeat-*',
        '-*elastic-cloud-logs-*',
      ],
    },
    {
      field: 'kibana.alert.rule.category',
      value: ['Custom Query Rule'],
    },
    {
      field: 'host.os.Ext.variant',
      value: ['Windows Server 2019 Datacenter'],
    },
    {
      field: 'event.action',
      value: ['exec'],
    },
    {
      field: 'event.ingested',
      value: ['2022-10-14T14:00:50.000Z'],
    },
    {
      field: '@timestamp',
      value: ['2023-04-25T09:03:15.515Z'],
    },
    {
      field: 'kibana.alert.original_event.action',
      value: ['exec'],
    },
    {
      field: 'signal.rule.updated_by',
      value: ['elastic'],
    },
    {
      field: 'host.os.platform',
      value: ['windows'],
    },
    {
      field: 'kibana.alert.rule.severity',
      value: ['low'],
    },
    {
      field: 'kibana.alert.original_event.agent_id_status',
      value: ['verified'],
    },
    {
      field: 'data_stream.dataset',
      value: ['endpoint.events.file'],
    },
    {
      field: 'host.risk.calculated_level',
      value: ['Low'],
    },
    {
      field: 'kibana.alert.rule.execution.uuid',
      value: ['3e763264-9eab-4c6b-98e8-d51367491275'],
    },
    {
      field: 'kibana.alert.uuid',
      value: ['1066d5c3675d7eef4b9e84af64e795be39d1896ec791049eb87a39eb9675a2aa'],
    },
    {
      field: 'kibana.alert.rule.meta.kibana_siem_app_url',
      value: ['http://localhost:5601/app/security'],
    },
    {
      field: 'kibana.version',
      value: ['8.8.0'],
    },
    {
      field: 'event.id',
      value: ['MnfiZLkz1DywMGBf++++9ApC'],
    },
    {
      field: 'signal.rule.license',
      value: [''],
    },
    {
      field: 'signal.ancestors.type',
      value: ['event', 'signal'],
    },
    {
      field: 'kibana.alert.rule.rule_id',
      value: ['caf0db0c-c7e2-455e-89b8-6b0d73619ae5'],
    },
    {
      field: 'kibana.alert.ancestors.rule',
      value: ['532e0020-4a0c-11ed-9aa3-574e520c127d'],
    },
    {
      field: 'user.name.text',
      value: ['SYSTEM'],
    },
    {
      field: 'file.path',
      value: ['C:\\ProgramData\\winlogbeat\\.winlogbeat.yml.new'],
    },
    {
      field: 'signal.rule.type',
      value: ['query'],
    },
    {
      field: 'kibana.alert.ancestors.id',
      value: [
        'cyjM1oMBw7Pvz6uQMxM4',
        'd46d9fecad3a03741575f552c994ec9c9e5d1089557d49d125255bcd8d863a99',
      ],
    },
    {
      field: 'kibana.alert.rule.building_block_type',
      value: ['default'],
    },
    {
      field: 'process.name.text',
      value: ['winlogbeat.exe'],
    },
    {
      field: 'host.os.full',
      value: ['Windows Server 2019 Datacenter 1809 (10.0.17763.3406)'],
    },
    {
      field: 'user.risk.calculated_level',
      value: ['High'],
    },
    {
      field: 'kibana.alert.url',
      value: [
        'http://localhost:5601/app/security/alerts/redirect/1066d5c3675d7eef4b9e84af64e795be39d1896ec791049eb87a39eb9675a2aa?index=.alerts-security.alerts-default&timestamp=2023-04-25T09:03:15.515Z',
      ],
    },
    {
      field: 'kibana.alert.rule.description',
      value: ['Custom Rule'],
    },
    {
      field: 'kibana.alert.building_block_type',
      value: ['default'],
    },
    {
      field: 'process.pid',
      value: [1704],
    },
    {
      field: 'kibana.alert.rule.producer',
      value: ['siem'],
    },
    {
      field: 'signal.rule.interval',
      value: ['5m'],
    },
    {
      field: 'signal.rule.created_by',
      value: ['elastic'],
    },
    {
      field: 'kibana.alert.rule.to',
      value: ['now'],
    },
    {
      field: 'kibana.alert.rule.created_by',
      value: ['elastic'],
    },
    {
      field: 'kibana.alert.original_event.ingested',
      value: ['2022-10-14T14:00:50.000Z'],
    },
    {
      field: 'signal.rule.id',
      value: ['023a0260-e348-11ed-bd43-632e972150d6'],
    },
    {
      field: 'process.code_signature.subject_name',
      value: ['Elasticsearch, Inc.'],
    },
    {
      field: 'signal.rule.risk_score',
      value: [21],
    },
    {
      field: 'signal.reason',
      value: [
        'file event with process winlogbeat.exe, file .winlogbeat.yml.new, by SYSTEM on siem-windows-endpoint created low alert Custom Rule.',
      ],
    },
    {
      field: 'user.risk.calculated_score_norm',
      value: [75.22127],
    },
    {
      field: 'host.os.name',
      value: ['Windows'],
    },
    {
      field: 'kibana.alert.rule.name',
      value: ['Custom Rule'],
    },
    {
      field: 'host.name',
      value: ['siem-windows-endpoint'],
    },
    {
      field: 'signal.status',
      value: ['open'],
    },
    {
      field: 'event.kind',
      value: ['signal'],
    },
    {
      field: 'process.code_signature.trusted',
      value: [true],
    },
    {
      field: 'signal.rule.created_at',
      value: ['2023-04-25T09:03:13.384Z'],
    },
    {
      field: 'kibana.alert.workflow_status',
      value: ['open'],
    },
    {
      field: 'kibana.alert.original_event.created',
      value: ['2022-10-14T14:00:27.258Z'],
    },
    {
      field: 'kibana.alert.rule.uuid',
      value: ['023a0260-e348-11ed-bd43-632e972150d6'],
    },
    {
      field: 'kibana.alert.original_event.category',
      value: ['file'],
    },
    {
      field: 'kibana.alert.reason',
      value: [
        'file event with process winlogbeat.exe, file .winlogbeat.yml.new, by SYSTEM on siem-windows-endpoint created low alert Custom Rule.',
      ],
    },
    {
      field: 'data_stream.type',
      value: ['logs'],
    },
    {
      field: 'signal.ancestors.id',
      value: [
        'cyjM1oMBw7Pvz6uQMxM4',
        'd46d9fecad3a03741575f552c994ec9c9e5d1089557d49d125255bcd8d863a99',
      ],
    },
    {
      field: 'signal.original_time',
      value: ['2022-10-27T12:24:19.714Z'],
    },
    {
      field: 'process.name',
      value: ['winlogbeat.exe'],
    },
    {
      field: 'file.Ext.header_bytes',
      value: ['7570646174655f74696d653a20323032'],
    },
    {
      field: 'ecs.version',
      value: ['1.11.0'],
    },
    {
      field: 'signal.rule.severity',
      value: ['low'],
    },
    {
      field: 'kibana.alert.ancestors.index',
      value: ['.ds-logs-endpoint.events.file-default-2022.10.08-000003', 'auditbeat-bulk'],
    },
    {
      field: 'event.created',
      value: ['2022-10-14T14:00:27.258Z'],
    },
    {
      field: 'process.Ext.code_signature.trusted',
      value: [true],
    },
    {
      field: 'file.extension',
      value: ['new'],
    },
    {
      field: 'agent.version',
      value: ['8.5.0-SNAPSHOT'],
    },
    {
      field: 'kibana.alert.depth',
      value: [2],
    },
    {
      field: 'process.thread.id',
      value: [4100],
    },
    {
      field: 'host.os.family',
      value: ['windows'],
    },
    {
      field: 'kibana.alert.rule.from',
      value: ['now-6000000300s'],
    },
    {
      field: 'kibana.alert.rule.revision',
      value: [0],
    },
    {
      field: 'kibana.alert.rule.parameters',
      value: [
        {
          description: 'Custom Rule',
          risk_score: 21,
          severity: 'low',
          building_block_type: 'default',
          license: '',
          meta: {
            from: '100000000m',
            kibana_siem_app_url: 'http://localhost:5601/app/security',
          },
          author: [],
          false_positives: [],
          from: 'now-6000000300s',
          rule_id: 'caf0db0c-c7e2-455e-89b8-6b0d73619ae5',
          max_signals: 100,
          risk_score_mapping: [],
          severity_mapping: [],
          threat: [],
          to: 'now',
          references: [],
          version: 1,
          exceptions_list: [],
          immutable: false,
          related_integrations: [],
          required_fields: [],
          setup: '',
          type: 'query',
          language: 'kuery',
          index: [
            'apm-*-transaction*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'traces-apm*',
            'winlogbeat-*',
            '-*elastic-cloud-logs-*',
          ],
          query: '*',
          filters: [],
        },
      ],
    },
    {
      field: 'signal.rule.version',
      value: ['1'],
    },
    {
      field: 'signal.original_event.kind',
      value: ['signal'],
    },
    {
      field: 'file.Ext.monotonic_id',
      value: [157727],
    },
    {
      field: 'kibana.alert.status',
      value: ['active'],
    },
    {
      field: 'kibana.alert.last_detected',
      value: ['2023-04-25T09:03:15.535Z'],
    },
    {
      field: 'kibana.alert.original_event.dataset',
      value: ['endpoint.events.file'],
    },
    {
      field: 'signal.depth',
      value: [2],
    },
    {
      field: 'signal.rule.immutable',
      value: ['false'],
    },
    {
      field: 'event.sequence',
      value: [940441],
    },
    {
      field: 'kibana.alert.rule.rule_type_id',
      value: ['siem.queryRule'],
    },
    {
      field: 'signal.rule.name',
      value: ['Custom Rule'],
    },
    {
      field: 'signal.rule.rule_id',
      value: ['caf0db0c-c7e2-455e-89b8-6b0d73619ae5'],
    },
    {
      field: 'event.module',
      value: ['endpoint'],
    },
    {
      field: 'host.os.kernel',
      value: ['1809 (10.0.17763.3406)'],
    },
    {
      field: 'kibana.alert.rule.license',
      value: [''],
    },
    {
      field: 'kibana.alert.original_event.kind',
      value: ['signal'],
    },
    {
      field: 'process.executable',
      value: ['C:\\Program Files\\Winlogbeat\\winlogbeat.exe'],
    },
    {
      field: 'file.Ext.entropy',
      value: [5.273971112252894],
    },
    {
      field: 'signal.rule.description',
      value: ['Custom Rule'],
    },
    {
      field: 'kibana.alert.rule.updated_at',
      value: ['2023-04-25T09:03:13.384Z'],
    },
    {
      field: 'data_stream.namespace',
      value: ['default'],
    },
    {
      field: 'file.size',
      value: [1408],
    },
    {
      field: 'message',
      value: ['Endpoint file event'],
    },
    {
      field: 'process.Ext.code_signature.exists',
      value: [true],
    },
    {
      field: 'kibana.alert.original_event.sequence',
      value: [940441],
    },
    {
      field: 'signal.original_event.action',
      value: ['exec'],
    },
    {
      field: 'kibana.alert.rule.created_at',
      value: ['2023-04-25T09:03:13.384Z'],
    },
    {
      field: 'signal.rule.to',
      value: ['now'],
    },
    {
      field: 'event.type',
      value: ['creation'],
    },
    {
      field: 'process.entry_leader.entity_id',
      value: ['some98'],
    },
    {
      field: 'kibana.space_ids',
      value: ['default'],
    },
    {
      field: 'kibana.alert.rule.meta.from',
      value: ['100000000m'],
    },
    {
      field: 'event.dataset',
      value: ['endpoint.events.file'],
    },
    {
      field: 'kibana.alert.original_time',
      value: ['2022-10-27T12:24:19.714Z'],
    },
    {
      field: '_id',
      value: '1066d5c3675d7eef4b9e84af64e795be39d1896ec791049eb87a39eb9675a2aa',
    },
    {
      field: '_index',
      value: '.internal.alerts-security.alerts-default-000001',
    },
  ],
];
