/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Hunt } from '../types';

export const hunts: Hunt[] = [
  {
    name: 'GitHub - Repository Visibility Changed to Public',
    language: 'kuery',
    query: 'event.action: "repo.access" and github.visibility: "public"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0010',
        tacticName: 'Exfiltration',
        technique: 'T1567',
        techniqueName: 'Exfiltration Over Web Service',
      },
    ],
    falsePositives: [
      {
        '@timestamp': '2026-07-13T08:05:00.000Z',

        ecs: { version: '8.11.0' },
        data_stream: { type: 'logs', dataset: 'github.audit', namespace: 'default' },
        event: {
          action: 'repo.access',
          category: ['configuration'],
          type: ['change'],
          outcome: 'success',
          kind: 'event',
          dataset: 'github.audit',
          module: 'github',
        },
        source: { ip: '192.0.2.10' },
        user: {
          name: 'platform-admin',
          email: 'platform-admin@corp.example',
          full_name: 'Platform Admin',
        },
        organization: { name: 'corp-example' },
        github: {
          actor: 'platform-admin',
          actor_type: 'user',
          org: 'corp-example',
          repo: 'corp-example/oss-sdk',
          visibility: 'public',
          action: 'repo.access',
        },
        message:
          'Repository visibility changed to public — approved OSS release per LEGAL-2024-011',
        related: { user: ['platform-admin'], ip: ['192.0.2.10'] },
      },
    ],
  },
  {
    name: 'GitHub - Deploy Key Added to Repository',
    language: 'kuery',
    query: 'event.action: "deploy_key.create"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0003',
        tacticName: 'Persistence',
        technique: 'T1098.001',
        techniqueName: 'Additional Cloud Credentials',
      },
    ],
    falsePositives: [
      {
        '@timestamp': '2026-07-13T08:00:00.000Z',

        ecs: { version: '8.11.0' },
        data_stream: { type: 'logs', dataset: 'github.audit', namespace: 'default' },
        event: {
          action: 'deploy_key.create',
          category: ['configuration'],
          type: ['change'],
          outcome: 'success',
          kind: 'event',
          dataset: 'github.audit',
          module: 'github',
        },
        source: { ip: '192.0.2.10' },
        user: {
          name: 'platform-admin',
          email: 'platform-admin@corp.example',
          full_name: 'Platform Admin',
        },
        organization: { name: 'corp-example' },
        github: {
          actor: 'platform-admin',
          actor_type: 'user',
          org: 'corp-example',
          repo: 'corp-example/frontend-app',
          action: 'deploy_key.create',
        },
        message: 'Deploy key with read-only access added for Renovate dependency bot',
        related: { user: ['platform-admin'], ip: ['192.0.2.10'] },
      },
    ],
  },
  {
    name: 'GitHub - Organization Member Invited with Admin Role',
    language: 'kuery',
    query: 'event.action: "org.invite_member" and github.permission: "admin"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0004',
        tacticName: 'Privilege Escalation',
        technique: 'T1098.003',
        techniqueName: 'Additional Cloud Roles',
      },
    ],
  },
  {
    name: 'GitHub - Secrets Scanning Alert Dismissed',
    language: 'kuery',
    query: 'event.action: "secret_scanning_alert.dismiss"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0005',
        tacticName: 'Defense Evasion',
        technique: 'T1562.001',
        techniqueName: 'Disable or Modify Tools',
      },
    ],
  },
  {
    name: 'GitHub - Workflow Dispatch from Fork',
    language: 'kuery',
    query: 'event.action: "workflows.completed" and github.actor_type: "fork"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0001',
        tacticName: 'Initial Access',
        technique: 'T1195.002',
        techniqueName: 'Compromise Software Supply Chain',
      },
    ],
  },
];
