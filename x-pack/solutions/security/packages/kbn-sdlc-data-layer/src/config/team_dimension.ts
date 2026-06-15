/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

export interface TeamDimensionRecord {
  readonly org_team: {
    readonly key: string;
    readonly name: string;
    readonly members_count: number;
  };
  readonly subteams: readonly string[];
  readonly aliases: {
    readonly project_team_values: readonly string[];
    readonly github_labels: readonly string[];
    readonly github_org_slugs: readonly string[];
  };
}

export const TEAM_DIMENSION_SEED: readonly TeamDimensionRecord[] = [
  {
    org_team: { key: 'siem', name: 'SIEM', members_count: 65 },
    subteams: [
      'Detection Engine',
      'Entity Analytics',
      'Rule Management',
      'Threat Hunting',
      'Cases',
      'Core Analysis',
      'One Workflow',
      'Contextual Security Apps',
    ],
    aliases: {
      project_team_values: [
        'Core Analysis',
        'Entity Analytics',
        'One Workflow',
        'Contextual Security Apps',
        'Templates',
        'Rules Management',
        'Detections and Resp',
        'D&R',
        'Detection Rule Management',
        'ResponseOps',
        'SecuritySolution',
      ],
      github_labels: [
        'Team:Core Analysis',
        'Team:Core analysis',
        'Team:Entity Analytics',
        'Team:One Workflow',
        'Team:Cloud Security',
        'Team: SecuritySolution',
        'Team:Detection Rule Management',
        'Team:Detections and Resp',
        'Team:Detection Engine',
        'Team:ResponseOps',
        'Team:Threat Hunting',
        'Team:Threat Hunting:Investigations',
        'Team:SIEM',
        'Team:Contextual Security',
      ],
      github_org_slugs: [
        'core-analysis',
        'entity-analytics',
        'one-workflow',
        'contextual-security-apps',
      ],
    },
  },
  {
    org_team: { key: 'si', name: 'Security Intelligence', members_count: 43 },
    subteams: [
      'Applied ML',
      'GenAI R&D',
      'Security Machine Learning',
      'Elastic Security Labs',
      'Endpoint Protections',
      'TRADE',
      'Threat Data Services',
    ],
    aliases: {
      project_team_values: ['Tech-Lead', 'Machine Learning', 'StackML', 'TRaDE', 'TRADE'],
      github_labels: [
        'Team:Security ML',
        'Team:GenAI',
        'Team: TRADE',
        'Team: TRaDE',
        'Team: Threat Data Services',
        'Team:Detection Engineering',
        'Team:Security-Applied ML',
        'Team:Machine Learning Core',
      ],
      github_org_slugs: ['security-machine-learning', 'gen-ai'],
    },
  },
  {
    org_team: { key: 'sde', name: 'Security Data Exp.', members_count: 28 },
    subteams: [
      'Cloud Services',
      'Integration Experience',
      'Open Telemetry',
      'Service Integrations',
    ],
    aliases: {
      project_team_values: ['Cloud Services', 'Cloud Risk Analysis', 'SDE'],
      github_labels: [
        'Team:Cloud Services',
        'Team:Ingest',
        'Team:Security-Cloud Services',
        'Team:Ingest-EngProd',
        'Team:Security-Service Integrations',
      ],
      github_org_slugs: ['cloud-services', 'ingest'],
    },
  },
  {
    org_team: { key: 'xdr', name: 'XDR', members_count: 24 },
    subteams: [
      'EDR Workflows',
      'Linux Platform',
      'Response',
      'Configuration Management',
      'Native Integrations',
      'CI/Releases/Telemetry',
    ],
    aliases: {
      project_team_values: ['Fleet'],
      github_labels: [
        'Team:Endpoint',
        'Team:Defend',
        'Team:Defend Workflows',
        'Team:Fleet',
        'Team: Endpoint',
        'Team: Endpoint Platforms',
        'Team: Endpoint Protections',
        'Team:Security-Linux Platform',
        'Team:Security-Windows Platform',
        'Team: EDR Workflows',
        'Team:Endpoint Response',
        'Team: Endpoint Foundations',
        'Team:Linux Platform',
        'Team:Elastic-Agent',
      ],
      github_org_slugs: ['endpoint', 'defend'],
    },
  },
  {
    org_team: { key: 'pds', name: 'Platform Delivery', members_count: 22 },
    subteams: [
      'Infrastructure',
      'Engineering Productivity',
      'Quality',
      'Security Deployment',
      'Data Analytics',
    ],
    aliases: {
      project_team_values: [
        'Customer Support',
        'Security Deployment',
        'Infrastructure',
        'Data Analytics',
        'Engineering Productivity',
        'Quality',
      ],
      github_labels: [
        'Team:Platform',
        'Team:Build',
        'Team: Sec Eng Productivity',
        'Team:Platform-Billing',
        'Team:Security Solution Platform',
        'Team:Security-Deployment and Devices',
        'Team:Security Deployment',
        'Team:Deployment Management',
        'Team:Deployment Monitoring',
      ],
      github_org_slugs: ['platform', 'build', 'sec-eng-productivity', 'security-pds-deployment'],
    },
  },
];

export const ENGINEERING_TEAM_LABEL_NORMALIZATION: Readonly<Record<string, string>> = {
  'Team:Core analysis': 'Team:Core Analysis',
  'Team: SecuritySolution': 'Team:Cloud Security',
  'Team: GenAI': 'Team:GenAI',
  'Team: Detection Rule Management': 'Team:Detection Rule Management',
  'Team: Detections/Response': 'Team:Detections and Resp',
  'Team: Threat Hunting': 'Team:Threat Hunting',
  'Team: Contextual Security': 'Team:Contextual Security',
};

/** GitHub labels without a Team: prefix that map to a canonical Team: label for lookup. */
export const BARE_TEAM_LABEL_NORMALIZATION: Readonly<Record<string, string>> = {
  GenAI: 'Team:GenAI',
  'security-pds-deployment': 'Team:Security Deployment',
};

export const PROJECT_TEAM_TO_ENGINEERING: Readonly<Record<string, string>> = {
  'Contextual Security Apps': 'Contextual Security Apps',
};
