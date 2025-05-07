/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const vulnerabilitiesLatestMock = [
  {
    agent: {
      name: 'ip-172-31-17-52',
      id: '9e69d889-c0c0-4c3e-9dc7-01dcd7c7db10',
      ephemeral_id: '4fce6ed8-c9b3-40bb-b805-77e884cce0ef',
      type: 'cloudbeat',
      version: '8.8.0',
    },
    package: {
      path: 'snap-07b9e0d5eb5f324a1 (amazon 2 (Karoo))',
      fixed_version: '2.56.1-9.amzn2.0.6',
      name: 'glib2',
      type: 'amazon',
      version: '2.56.1-9.amzn2.0.5',
    },
    resource: {
      name: 'name-ng-1-Node',
      id: '02d62a7df23951b19',
    },
    elastic_agent: {
      id: '9e69d889-c0c0-4c3e-9dc7-01dcd7c7db10',
      version: '8.8.0',
      snapshot: false,
    },
    vulnerability: {
      severity: 'MEDIUM',
      package: {
        fixed_version: '2.56.1-9.amzn2.0.6',
        name: 'glib2',
        version: '2.56.1-9.amzn2.0.5',
      },
      description:
        'PCRE before 8.38 mishandles the [: and \\\\ substrings in character classes, which allows remote attackers to cause a denial of service (uninitialized memory read) or possibly have unspecified other impact via a crafted regular expression, as demonstrated by a JavaScript RegExp object encountered by Konqueror.',
      title:
        'pcre: uninitialized memory read triggered by malformed posix character class (8.38/22)',
      classification: 'CVSS',
      data_source: {
        ID: 'amazon',
        URL: 'https://alas.aws.amazon.com/',
        Name: 'Amazon Linux Security Center',
      },
      cwe: ['CWE-908'],
      reference: 'https://avd.aquasec.com/nvd/cve-2015-8390',
      score: {
        version: '3.1',
        base: 9.8,
      },
      report_id: 1687955586,
      scanner: {
        vendor: 'Trivy',
        version: 'v0.35.0',
      },
      id: 'CVE-2015-8390',
      enumeration: 'CVE',
      cvss: {
        redhat: {
          V2Vector: 'AV:N/AC:M/Au:N/C:N/I:N/A:P',
          V2Score: 4.3,
        },
        nvd: {
          V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
          V2Vector: 'AV:N/AC:L/Au:N/C:P/I:P/A:P',
          V3Score: 9.8,
          V2Score: 7.5,
        },
      },
      class: 'os-pkgs',
      published_date: '2015-12-02T01:59:00Z',
    },
    cloud: {
      provider: 'aws',
      region: 'eu-west-1',
      account: {
        name: 'elastic-security-cloud-security-dev',
        id: '704479110758',
      },
    },
    '@timestamp': '2023-06-29T02:08:44.993Z',
    cloudbeat: {
      commit_sha: '4d990caa0c9c1594441da6bf24a685599aeb2bd5',
      commit_time: '2023-05-15T14:48:10Z',
      version: '8.8.0',
    },
    ecs: {
      version: '8.6.0',
    },
    data_stream: {
      namespace: 'default',
      type: 'logs',
      dataset: 'cloud_security_posture.vulnerabilities',
    },
    host: {
      name: 'ip-172-31-17-52',
    },
    event: {
      agent_id_status: 'auth_metadata_missing',
      sequence: 1687955586,
      ingested: '2023-07-13T09:55:39Z',
      kind: 'state',
      created: '2023-06-29T02:08:44.993386561Z',
      id: '80d05bca-9900-4038-ac8d-bcefaf6afd0c',
      type: ['info'],
      category: ['vulnerability'],
      dataset: 'cloud_security_posture.vulnerabilities',
      outcome: 'success',
    },
  },
  {
    agent: {
      name: 'ip-172-31-17-52',
      id: '9e69d889-c0c0-4c3e-9dc7-01dcd7c7db11',
      type: 'cloudbeat',
      ephemeral_id: '4fce6ed8-c9b3-40bb-b805-77e884cce0ef',
      version: '8.8.0',
    },
    package: {
      path: 'snap-08c227d5c8a3dc1f2 (amazon 2 (Karoo))',
      fixed_version: '2.56.1-9.amzn2.0.6',
      name: 'glib2',
      type: 'amazon',
      version: '2.56.1-9.amzn2.0.5',
    },
    resource: {
      name: 'othername-june12-8-8-0-1',
      id: '09d11277683ea41c5',
    },
    elastic_agent: {
      id: '9e69d889-c0c0-4c3e-9dc7-01dcd7c7db11',
      version: '8.8.0',
      snapshot: false,
    },
    vulnerability: {
      severity: 'HIGH',
      package: {
        fixed_version: '2.56.1-9.amzn2.0.6',
        name: 'glib2',
        version: '2.56.1-9.amzn2.0.5',
      },
      description:
        'PCRE before 8.38 mishandles the (?(<digits>) and (?(R<digits>) conditions, which allows remote attackers to cause a denial of service (integer overflow) or possibly have unspecified other impact via a crafted regular expression, as demonstrated by a JavaScript RegExp object encountered by Konqueror.',
      classification: 'CVSS',
      title: 'pcre: Integer overflow caused by missing check for certain conditions (8.38/31)',
      data_source: {
        ID: 'amazon',
        URL: 'https://alas.aws.amazon.com/',
        Name: 'Amazon Linux Security Center',
      },
      reference: 'https://avd.aquasec.com/nvd/cve-2015-8394',
      cwe: ['CWE-190'],
      score: {
        version: '3.1',
        base: 9.8,
      },
      report_id: 1687955586,
      scanner: {
        vendor: 'Trivy',
        version: 'v0.35.0',
      },
      id: 'CVE-2015-8394',
      enumeration: 'CVE',
      class: 'os-pkgs',
      published_date: '2015-12-02T01:59:00Z',
      cvss: {
        redhat: {
          V2Vector: 'AV:N/AC:M/Au:N/C:N/I:N/A:P',
          V2Score: 4.3,
        },
        nvd: {
          V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
          V2Vector: 'AV:N/AC:L/Au:N/C:P/I:P/A:P',
          V3Score: 9.8,
          V2Score: 7.5,
        },
      },
    },
    cloud: {
      provider: 'aws',
      region: 'eu-west-1',
      account: {
        name: 'elastic-security-cloud-security-dev',
        id: '704479110758',
      },
    },
    '@timestamp': '2023-06-29T02:08:16.535Z',
    ecs: {
      version: '8.6.0',
    },
    cloudbeat: {
      commit_sha: '4d990caa0c9c1594441da6bf24a685599aeb2bd5',
      commit_time: '2023-05-15T14:48:10Z',
      version: '8.8.0',
    },
    data_stream: {
      namespace: 'default',
      type: 'logs',
      dataset: 'cloud_security_posture.vulnerabilities',
    },
    host: {
      name: 'ip-172-31-17-52',
    },
    event: {
      agent_id_status: 'auth_metadata_missing',
      sequence: 1687955586,
      ingested: '2023-07-13T09:55:39Z',
      created: '2023-06-29T02:08:16.535506246Z',
      kind: 'state',
      id: '7cd4309a-01dd-433c-8c44-14019f8b1522',
      category: ['vulnerability'],
      type: ['info'],
      dataset: 'cloud_security_posture.vulnerabilities',
      outcome: 'success',
    },
  },
];

export const scoresVulnerabilitiesMock = [
  {
    '@timestamp': '2023-09-03T11:36:58.441344Z',
    critical: 0,
    high: 1,
    medium: 1,
    low: 0,
    policy_template: 'vuln_mgmt',
    vulnerabilities_stats_by_cloud_account: {
      '704479110758': {
        cloudAccountName: 'elastic-security-cloud-security-dev',
        cloudAccountId: '704479110758',
        critical: 0,
        high: 1,
        medium: 1,
        low: 0,
      },
    },
  },
  {
    '@timestamp': '2023-09-03T11:36:58.441344Z',
    critical: 0,
    high: 1,
    medium: 1,
    low: 0,
    policy_template: 'vuln_mgmt',
    vulnerabilities_stats_by_cloud_account: {
      '704479110758': {
        cloudAccountName: 'elastic-security-cloud-security-dev',
        cloudAccountId: '704479110758',
        critical: 0,
        high: 1,
        medium: 1,
        low: 0,
      },
    },
  },
];
