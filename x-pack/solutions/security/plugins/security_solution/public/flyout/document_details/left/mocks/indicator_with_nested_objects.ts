/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This represents an indicator document with an array of objects as field
 * values. This shape of indicator was previously causing render errors in the
 * CTI UI.
 */
export const indicatorWithNestedObjects = {
  'threat.indicator.type': ['ipv4-addr'],
  'elastic_agent.version': ['8.10.4'],
  'event.category': ['threat'],
  'recordedfuture.risk_string': ['7/75'],
  'threat.indicator.provider': [
    'Mastodon',
    'Twitter',
    'Recorded Future Command & Control Reports',
    'Recorded Future Sandbox - Malware C2 Extractions',
    'GitHub',
    'Recorded Future Command & Control Validation',
    'Malware Patrol',
    'Polyswarm Sandbox Analysis - Malware C2 Extractions',
    'Recorded Future Triage Malware Analysis - Malware C2 Extractions',
  ],
  'agent.type': ['filebeat'],
  'agent.name': ['win-10'],
  'elastic_agent.snapshot': [false],
  'event.agent_id_status': ['verified'],
  'event.kind': ['enrichment'],
  'threat.feed.name': ['Recorded Future'],
  'elastic_agent.id': ['e8ffaf42-7436-4e39-b895-772bb86e6585'],
  'recordedfuture.name': ['188.116.21.141'],
  'data_stream.namespace': ['default'],
  'recordedfuture.evidence_details': [
    {
      SourcesCount: 2,
      SightingsCount: 2,
      CriticalityLabel: 'Unusual',
      Rule: 'Recently Reported as a Defanged IP',
      EvidenceString:
        '2 sightings on 2 sources: Mastodon, Twitter. Most recent link (Feb 13, 2024): https://ioc.exchange/@SarlackLab/111926194382069197',
      Sources: ['source:pupSAn', 'source:BV5'],
      Timestamp: '2024-02-13T21:03:10.000Z',
      Name: 'recentDefanged',
      MitigationString: '',
      Criticality: 1,
    },
    {
      SourcesCount: 2,
      SightingsCount: 12,
      CriticalityLabel: 'Suspicious',
      Rule: 'Historically Reported C&C Server',
      EvidenceString:
        '12 sightings on 2 sources: Recorded Future Command & Control Reports, Recorded Future Sandbox - Malware C2 Extractions. 188.116.21.141:20213 was reported as a command and control server for RedLine Stealer on Feb 10, 2024',
      Sources: ['source:qU_q-9', 'source:oWAG20'],
      Timestamp: '2024-02-10T08:22:27.790Z',
      Name: 'reportedCnc',
      MitigationString: '',
      Criticality: 2,
    },
    {
      SourcesCount: 1,
      SightingsCount: 2,
      CriticalityLabel: 'Suspicious',
      Rule: 'Recently Linked to Intrusion Method',
      EvidenceString:
        '2 sightings on 1 source: GitHub. 6 related intrusion methods including DDOS Toolkit, njRAT, Phishing, Remote Access Trojan, Stealware. Most recent link (Feb 13, 2024): https://github.com/0xDanielLopez/TweetFeed/commit/fd64eaa71f7e948d1cca1dc8c148b6515e878df5',
      Sources: ['source:MIKjae'],
      Timestamp: '2024-02-13T21:57:24.894Z',
      Name: 'recentLinkedIntrusion',
      MitigationString: '',
      Criticality: 2,
    },
    {
      SourcesCount: 1,
      SightingsCount: 11,
      CriticalityLabel: 'Suspicious',
      Rule: 'Previously Validated C&C Server',
      EvidenceString:
        '11 sightings on 1 source: Recorded Future Command & Control Validation. Recorded Future analysis validated 188.116.21.141:20213 as a command and control server for RedLine Stealer on Feb 22, 2024',
      Sources: ['source:qGriFQ'],
      Timestamp: '2024-02-22T00:06:26.000Z',
      Name: 'validatedCnc',
      MitigationString: '',
      Criticality: 2,
    },
    {
      SourcesCount: 1,
      SightingsCount: 1,
      CriticalityLabel: 'Suspicious',
      Rule: 'Recent Suspected C&C Server',
      EvidenceString:
        '1 sighting on 1 source: Malware Patrol. Malware Patrol identified 188.116.21.141:20213 as a command and control server for RecordBreaker Stealer on February 14, 2024.',
      Sources: ['source:qs_-cU'],
      Timestamp: '2024-02-14T10:55:01.908Z',
      Name: 'recentSuspectedCnc',
      MitigationString: '',
      Criticality: 2,
    },
    {
      SourcesCount: 4,
      SightingsCount: 26,
      CriticalityLabel: 'Malicious',
      Rule: 'Recently Reported C&C Server',
      EvidenceString:
        '26 sightings on 4 sources: Polyswarm Sandbox Analysis - Malware C2 Extractions, Recorded Future Command & Control Reports, Recorded Future Triage Malware Analysis - Malware C2 Extractions, Recorded Future Sandbox - Malware C2 Extractions. 188.116.21.141:20213 was reported as a command and control server for Redline Stealer on Feb 21, 2024',
      Sources: ['source:hyihHO', 'source:qU_q-9', 'source:nTcIsu', 'source:oWAG20'],
      Timestamp: '2024-02-21T08:22:44.811Z',
      Name: 'recentReportedCnc',
      MitigationString: '',
      Criticality: 3,
    },
    {
      SourcesCount: 1,
      SightingsCount: 3,
      CriticalityLabel: 'Very Malicious',
      Rule: 'Validated C&C Server',
      EvidenceString:
        '3 sightings on 1 source: Recorded Future Command & Control Validation. Recorded Future analysis validated 188.116.21.141:20213 as a command and control server for RedLine Stealer on Feb 24, 2024',
      Sources: ['source:qGriFQ'],
      Timestamp: '2024-02-24T00:52:16.000Z',
      Name: 'recentValidatedCnc',
      MitigationString: '',
      Criticality: 4,
    },
  ],
  'input.type': ['httpjson'],
  'data_stream.type': ['logs'],
  'event.risk_score': [98],
  tags: ['forwarded', 'recordedfuture'],
  'event.ingested': ['2024-02-24T17:32:40.000Z'],
  '@timestamp': ['2024-02-24T17:32:37.813Z'],
  'agent.id': ['e8ffaf42-7436-4e39-b895-772bb86e6585'],
  'threat.indicator.ip': ['188.116.21.141'],
  'ecs.version': ['8.11.0'],
  'data_stream.dataset': ['ti_recordedfuture.threat'],
  'event.created': ['2024-02-24T17:32:37.813Z'],
  'event.type': ['indicator'],
  'agent.ephemeral_id': ['0532c813-1434-4c76-800b-6abdf7eaf62c'],
  'agent.version': ['8.10.4'],
  'event.dataset': ['ti_recordedfuture.threat'],
} as const;
