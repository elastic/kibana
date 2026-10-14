/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Hunt } from '../types';

export const hunts: Hunt[] = [
  {
    name: 'Okta Login from New Geographic Location',
    language: 'kuery',
    query: 'event.action: "user.session.start" and okta.client.geographical_context.country: "RU"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0001',
        tacticName: 'Initial Access',
        technique: 'T1078.004',
        techniqueName: 'Cloud Accounts',
      },
    ],
  },
  {
    name: 'Okta MFA Factor Reset After Authentication',
    language: 'kuery',
    query: 'event.action: "user.mfa.factor.deactivate"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0006',
        tacticName: 'Credential Access',
        technique: 'T1556',
        techniqueName: 'Modify Authentication Process',
      },
    ],
    falsePositives: [
      {
        '@timestamp': '2026-07-13T08:15:00.000Z',

        ecs: { version: '8.11.0' },
        data_stream: { type: 'logs', dataset: 'okta.system', namespace: 'default' },
        event: {
          action: 'user.mfa.factor.deactivate',
          category: ['iam'],
          outcome: 'success',
          kind: 'event',
          dataset: 'okta.system',
          module: 'okta',
        },
        user: {
          name: 'helpdesk@corp.example',
          email: 'helpdesk@corp.example',
          full_name: 'IT Helpdesk',
        },
        'user.target': {
          name: 'm.johnson@corp.example',
          email: 'm.johnson@corp.example',
          full_name: 'Mary Johnson',
        },
        source: { ip: '192.0.2.5' },
        okta: {
          actor: { alternate_id: 'helpdesk@corp.example', display_name: 'IT Helpdesk' },
          outcome: { result: 'SUCCESS' },
          target: [
            {
              type: 'User',
              alternateId: 'm.johnson@corp.example',
              displayName: 'Mary Johnson',
            },
          ],
          client: {
            ip_address: '192.0.2.5',
            geographical_context: { country: 'US', city: 'Austin' },
          },
        },
        related: { user: ['helpdesk@corp.example', 'm.johnson@corp.example'], ip: ['192.0.2.5'] },
      },
    ],
  },
  {
    name: 'Okta Admin Role Assigned to User',
    language: 'kuery',
    query: 'event.action: "user.account.privilege.grant"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0004',
        tacticName: 'Privilege Escalation',
        technique: 'T1098',
        techniqueName: 'Account Manipulation',
      },
    ],
    falsePositives: [
      {
        '@timestamp': '2026-07-13T08:10:00.000Z',

        ecs: { version: '8.11.0' },
        data_stream: { type: 'logs', dataset: 'okta.system', namespace: 'default' },
        event: {
          action: 'user.account.privilege.grant',
          category: ['iam'],
          outcome: 'success',
          kind: 'event',
          dataset: 'okta.system',
          module: 'okta',
        },
        user: {
          name: 'it-admin@corp.example',
          email: 'it-admin@corp.example',
          full_name: 'Mike Torres',
        },
        'user.target': {
          name: 'oncall-eng@corp.example',
          email: 'oncall-eng@corp.example',
          full_name: 'On-Call Engineer',
        },
        source: { ip: '192.0.2.5' },
        okta: {
          actor: { alternate_id: 'it-admin@corp.example', display_name: 'Mike Torres' },
          outcome: { result: 'SUCCESS' },
          target: [
            {
              type: 'User',
              alternateId: 'oncall-eng@corp.example',
              displayName: 'On-Call Engineer',
            },
          ],
          client: {
            ip_address: '192.0.2.5',
            geographical_context: { country: 'US', city: 'Austin' },
          },
          debugContext: {
            debugData: { changedAttributes: 'role: Read-Only Admin → Super Admin (temp 4h)' },
          },
        },
        related: {
          user: ['it-admin@corp.example', 'oncall-eng@corp.example'],
          ip: ['192.0.2.5'],
        },
      },
    ],
  },
  {
    name: 'Okta API Token Created by New Admin',
    language: 'kuery',
    query: 'event.action: "system.api_token.create"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0003',
        tacticName: 'Persistence',
        technique: 'T1136.003',
        techniqueName: 'Cloud Account',
      },
    ],
  },
  {
    name: 'Multiple Okta Accounts Compromised from Same IP',
    language: 'kuery',
    // Distinct from MFA Factor Reset (same action was double-matching). Password reset from the
    // shared attacker geo is unique in the seeded story and still represents account takeover.
    query:
      'event.action: "user.account.update_password" and okta.client.geographical_context.country: "RU"',
    ruleType: 'query',
    mitre: [
      {
        tactic: 'TA0006',
        tacticName: 'Credential Access',
        technique: 'T1098',
        techniqueName: 'Account Manipulation',
      },
    ],
  },
];
