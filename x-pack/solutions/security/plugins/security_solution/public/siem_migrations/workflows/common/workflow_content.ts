/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrationComment } from '../../../../common/siem_migrations/model/common.gen';
import { SIEM_MIGRATIONS_ASSISTANT_USER } from '../../../../common/siem_migrations/constants';

export type WorkflowMigrationStatus = 'translated' | 'partially_translated' | 'installed' | 'error';

export interface WorkflowMigrationRow {
  id: string;
  name: string;
  description: string;
  /** EUI icon type representing the workflow's trigger */
  triggerIcon: string;
  /** EUI icon types (generic action icons and/or app logos) for the workflow's steps */
  stepIcons: string[];
  steps: number;
  migrationStatus: WorkflowMigrationStatus;
  /** Number of connectors configured out of the number required */
  connectorsInstalled: number;
  connectorsTotal: number;
  /** ISO date of the last update to the translated workflow */
  updatedAt: string;
}

export const MOCK_WORKFLOW_ROWS: WorkflowMigrationRow[] = [
  {
    id: 'phishing-email-response',
    name: 'Phishing Email — End-to-End Response',
    description: 'Automated end-to-end phishing email response, migrated from a Tines Story.',
    triggerIcon: 'warning',
    stepIcons: ['console', 'globe', 'briefcase', 'logoGmail'],
    steps: 8,
    migrationStatus: 'partially_translated',
    connectorsInstalled: 1,
    connectorsTotal: 2,
    updatedAt: '2026-10-15T12:08:34.558Z',
  },
  {
    id: 'national-parks',
    name: 'National parks',
    description: 'Extract entities from AWS cloud trail event as Keep alerts',
    triggerIcon: 'play',
    stepIcons: ['console', 'globe', 'logoAws'],
    steps: 5,
    migrationStatus: 'partially_translated',
    connectorsInstalled: 1,
    connectorsTotal: 2,
    updatedAt: '2026-10-15T12:08:34.558Z',
  },
  {
    id: 'trigger-workflow-from-slack-message',
    name: 'Trigger workflow from Slack message',
    description: 'A Slack message with a button that triggers a workflow',
    triggerIcon: 'play',
    stepIcons: ['console', 'logoSlack'],
    steps: 3,
    migrationStatus: 'installed',
    connectorsInstalled: 1,
    connectorsTotal: 1,
    updatedAt: '2026-10-14T16:20:11.000Z',
  },
  {
    id: 'slack-basic-demo',
    name: 'slack-basic-demo',
    description: 'Send a Slack message when a CloudWatch alarm is triggered',
    triggerIcon: 'play',
    stepIcons: ['globe', 'logoSlack'],
    steps: 2,
    migrationStatus: 'installed',
    connectorsInstalled: 2,
    connectorsTotal: 2,
    updatedAt: '2026-10-14T16:20:11.000Z',
  },
  {
    id: 'github-pr-notification',
    name: 'GitHub PR Notification',
    description: 'Send a Slack message when a pull request is opened',
    triggerIcon: 'play',
    stepIcons: ['logoGithub', 'logoSlack'],
    steps: 2,
    migrationStatus: 'translated',
    connectorsInstalled: 2,
    connectorsTotal: 2,
    updatedAt: '2026-10-15T12:08:34.558Z',
  },
  {
    id: 'jira-issue-update',
    name: 'JIRA Issue Update',
    description: 'Send a Slack message when a JIRA issue is updated',
    triggerIcon: 'warning',
    stepIcons: ['refresh', 'apps', 'asterisk', 'branch', 'briefcase', 'logoSlack'],
    steps: 3,
    migrationStatus: 'error',
    connectorsInstalled: 0,
    connectorsTotal: 1,
    updatedAt: '2026-10-15T12:08:34.558Z',
  },
  {
    id: 'daily-standup-reminder',
    name: 'Daily Standup Reminder',
    description: 'Post a daily reminder for the standup meeting at 9 AM',
    triggerIcon: 'play',
    stepIcons: ['console', 'logoSlack'],
    steps: 2,
    migrationStatus: 'installed',
    connectorsInstalled: 1,
    connectorsTotal: 1,
    updatedAt: '2026-10-13T09:02:45.000Z',
  },
  {
    id: 'draft-test',
    name: 'Draft test',
    description: 'No description',
    triggerIcon: 'play',
    stepIcons: [],
    steps: 1,
    migrationStatus: 'translated',
    connectorsInstalled: 0,
    connectorsTotal: 0,
    updatedAt: '2026-10-15T12:08:34.558Z',
  },
  {
    id: 'new-user-signup-alert',
    name: 'New User Signup Alert',
    description: 'Notify the team when a new user signs up on the platform',
    triggerIcon: 'play',
    stepIcons: ['console', 'globe', 'logoSlack'],
    steps: 4,
    migrationStatus: 'installed',
    connectorsInstalled: 1,
    connectorsTotal: 1,
    updatedAt: '2026-10-13T09:02:45.000Z',
  },
  {
    id: 'server-downtime-notification',
    name: 'Server Downtime Notification',
    description: 'Send an alert to the channel if the server goes down',
    triggerIcon: 'play',
    stepIcons: ['refresh', 'globe', 'logoSlack'],
    steps: 2,
    migrationStatus: 'installed',
    connectorsInstalled: 1,
    connectorsTotal: 1,
    updatedAt: '2026-10-14T16:20:11.000Z',
  },
  {
    id: 'monthly-performance-review',
    name: 'Monthly Performance Review',
    description: 'Share a summary of team performance metrics at the end of each month',
    triggerIcon: 'warning',
    stepIcons: ['console', 'globe', 'logoGmail'],
    steps: 3,
    migrationStatus: 'error',
    connectorsInstalled: 1,
    connectorsTotal: 2,
    updatedAt: '2026-10-15T12:08:34.558Z',
  },
];

export type PhishingStepStatus = 'mapped' | 'needs_review';

export interface PhishingStep {
  title: string;
  status: PhishingStepStatus;
  description: string;
  tag: string;
  /** Elastic Workflows step type the original step was translated to */
  stepType: string;
  /** EUI icon type shown in the graph node */
  icon: string;
}

export const PHISHING_EMAIL_STEPS: PhishingStep[] = [
  {
    title: 'Parse Email Headers',
    status: 'mapped',
    description: 'Extract sender, recipient, subject, and message-id from raw email headers',
    tag: 'utility',
    stepType: 'elasticsearch.search',
    icon: 'logoElasticsearch',
  },
  {
    title: 'Threat Intel Lookup — Sender',
    status: 'mapped',
    description: 'Query VirusTotal and internal blocklist for sender domain reputation',
    tag: 'ti_lookup',
    stepType: 'http.request',
    icon: 'globe',
  },
  {
    title: 'Extract URLs from Body',
    status: 'mapped',
    description: 'Parse all href links from HTML and plain-text email body',
    tag: 'utility',
    stepType: 'utility.regex_extract',
    icon: 'console',
  },
  {
    title: 'Scan URLs',
    status: 'needs_review',
    description: 'Submit URLs to VirusTotal URL scanner and wait for results',
    tag: 'ti_lookup',
    stepType: 'http.request',
    icon: 'globe',
  },
  {
    title: 'Quarantine Email',
    status: 'mapped',
    description: 'Move email to quarantine folder if malicious indicators found',
    tag: 'containment',
    stepType: 'elasticsearch.update',
    icon: 'logoElasticsearch',
  },
  {
    title: 'Notify Affected User',
    status: 'mapped',
    description: 'Send templated warning email to affected user via SMTP',
    tag: 'notification',
    stepType: 'notification.email',
    icon: 'email',
  },
  {
    title: 'Create Incident Case',
    status: 'needs_review',
    description: 'Open incident ticket in ServiceNow with enriched context',
    tag: 'case_management',
    stepType: 'http.request',
    icon: 'globe',
  },
  {
    title: 'Close Alert',
    status: 'mapped',
    description: 'Mark the originating alert as resolved',
    tag: 'alerting',
    stepType: 'elasticsearch.update',
    icon: 'logoElasticsearch',
  },
];

export const PHISHING_EMAIL_YAML = `name: phishing-email-response
description: Automated end-to-end phishing email response
version: "1.0"

trigger:
  type: alert
  conditions:
    rule.name: "Phishing Link in Email Attachment"

inputs:
  - name: email_message_id
    from: alert.fields.email.message_id
  - name: affected_user_email
    from: alert.fields.user.email

steps:
  - name: parse-email-headers
    type: elasticsearch.search
    config:
      index: logs-email.*
      query:
        match:
          message_id: "{{inputs.email_message_id}}"

  - name: threat-intel-lookup-sender
    type: http.request
    config:
      url: "https://www.virustotal.com/api/v3/domains/{{steps.parse-email-headers.sender_domain}}"

  - name: extract-urls-from-body
    type: utility.regex_extract
    config:
      pattern: "https?://[^\\\\s\\"]+"

  - name: scan-urls
    type: http.request
    needs_review: true
    config:
      url: "https://www.virustotal.com/api/v3/urls"

  - name: quarantine-email
    type: elasticsearch.update
    config:
      index: logs-email.*

  - name: notify-affected-user
    type: notification.email
    config:
      to: "{{inputs.affected_user_email}}"

  - name: create-incident-case
    type: http.request
    needs_review: true
    config:
      url: "https://servicenow.example.com/api/now/table/incident"

  - name: close-alert
    type: elasticsearch.update
    config:
      index: .alerts-security*
`;

export const PHISHING_EMAIL_SUMMARY_COMMENTS: MigrationComment[] = [
  {
    message: '## Prebuilt Workflow Matching Summary\nNo matching prebuilt workflow found.',
    created_at: '2026-10-15T12:08:34.558Z',
    created_by: SIEM_MIGRATIONS_ASSISTANT_USER,
  },
  {
    message: `## Translation Summary
The Tines Story was partially translated into an Elastic workflow. 6 of 8 steps were mapped automatically. \`Scan URLs\` and \`Create Incident Case\` need review, because they require connector or API configuration:

\`\`\`yaml
- name: scan-urls
  type: http.request
  needs_review: true
  config:
    url: "https://www.virustotal.com/api/v3/urls"

- name: create-incident-case
  type: http.request
  needs_review: true
  config:
    url: "https://servicenow.example.com/api/now/table/incident"
\`\`\``,
    created_at: '2026-10-15T12:08:34.558Z',
    created_by: SIEM_MIGRATIONS_ASSISTANT_USER,
  },
];

/** First lines of the workflow YAML, for compact previews. */
export const PHISHING_EMAIL_YAML_SHORT = `${PHISHING_EMAIL_YAML.split('\n')
  .slice(0, 16)
  .join('\n')}\n# …`;
